"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot, query, runTransaction, where, writeBatch } from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { useAuthUser } from "./authService";

/**
 * Subject folders. They live on the user's profile doc (`users/{uid}.folders`)
 * so empty folders exist and renaming one is a single write; each cloud
 * document just carries a `folderId`. Reusing the profile doc also means no
 * new Firestore rules are needed (see firestore.rules).
 */
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

const USERS = "users";
const MAX_NAME = 60;

function clean(raw: unknown): Folder[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Folder => !!f && typeof f.id === "string" && typeof f.name === "string")
    .map((f) => ({ id: f.id, name: f.name, createdAt: typeof f.createdAt === "number" ? f.createdAt : 0 }));
}

function normalise(name: string): string {
  const n = name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
  if (!n) throw new Error("Give the subject a name.");
  return n;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
}

/** Live-subscribes to the user's folders. Returns an unsubscribe function. */
export function watchFolders(uid: string, onChange: (folders: Folder[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    doc(getDb(), USERS, uid),
    (snap) => onChange(clean(snap.data()?.folders)),
    (err) => onError(err instanceof Error ? err : new Error(String(err)))
  );
}

async function mutate(uid: string, change: (folders: Folder[]) => Folder[]): Promise<void> {
  const ref = doc(getDb(), USERS, uid);
  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(ref);
    tx.set(ref, { folders: change(clean(snap.data()?.folders)) }, { merge: true });
  });
}

function assertUnique(folders: Folder[], name: string, exceptId?: string) {
  if (folders.some((f) => f.id !== exceptId && f.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A subject with that name already exists.");
  }
}

export async function createFolder(uid: string, rawName: string): Promise<Folder> {
  const name = normalise(rawName);
  const folder: Folder = { id: newId(), name, createdAt: Date.now() };
  await mutate(uid, (folders) => {
    assertUnique(folders, name);
    return [...folders, folder];
  });
  return folder;
}

export async function renameFolder(uid: string, id: string, rawName: string): Promise<void> {
  const name = normalise(rawName);
  await mutate(uid, (folders) => {
    assertUnique(folders, name, id);
    return folders.map((f) => (f.id === id ? { ...f, name } : f));
  });
}

/** Removes the folder; its files are kept and move back to "All files". */
export async function deleteFolder(uid: string, id: string): Promise<void> {
  const inside = await getDocs(
    query(collection(getDb(), "documents"), where("userId", "==", uid), where("folderId", "==", id))
  );
  const batch = writeBatch(getDb());
  inside.forEach((d) => batch.update(d.ref, { folderId: null }));
  await batch.commit();
  await mutate(uid, (folders) => folders.filter((f) => f.id !== id));
}

/** Folders for the signed-in user, live. `null` until loaded (or when signed out). */
export function useFolders(): Folder[] | null {
  const user = useAuthUser();
  const uid = user?.uid;
  const [folders, setFolders] = useState<Folder[] | null>(null);

  useEffect(() => {
    if (!uid) {
      setFolders(null);
      return;
    }
    return watchFolders(
      uid,
      (f) => setFolders([...f].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))),
      (err) => {
        console.error("Failed to load folders:", err);
        setFolders([]);
      }
    );
  }, [uid]);

  return folders;
}
