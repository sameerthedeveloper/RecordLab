import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebaseConfig";
import type { CloudDocument, RlabPayload } from "./firestoreService";
import type { Folder } from "./folderService";
import { sanitizeTemplate, type SectionTemplate } from "./sections";

/*
 * A folder link is a snapshot stored in the same `shares` collection as record links, so it needs no new
 * Firestore rules: one share per record (a folder would not fit in Firestore's 1 MB document limit) plus one
 * index that lists them. The index is written last, so a half-made link never opens.
 */
const COLLECTION = "shares";

export interface SharedFolderItem {
  /** Share id of this record's snapshot: opens at /editor?share=<id>. */
  id: string;
  title: string;
  exercise: string;
  date: string;
}

export interface SharedFolder {
  name: string;
  template: SectionTemplate | null;
  layoutMode: NonNullable<Folder["layoutMode"]>;
  items: SharedFolderItem[];
}

export const folderShareUrl = (id: string) => `${window.location.origin}/folder/${id}`;

/** Publishes a snapshot of every record in the folder and returns the link. */
export async function createFolderShare(
  folder: Folder,
  documents: CloudDocument[],
  onProgress?: (done: number) => void
): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in to share a folder.");
  if (documents.length === 0) throw new Error("This folder is empty. Add a record first.");

  const shares = collection(getDb(), COLLECTION);
  const index = doc(shares);
  const sorted = [...documents].sort(
    (a, b) =>
      (a.data.record.exercise_number || "").localeCompare(b.data.record.exercise_number || "", undefined, { numeric: true }) ||
      a.title.localeCompare(b.title, undefined, { numeric: true })
  );
  const items: SharedFolderItem[] = [];
  const written: string[] = [];

  try {
    for (const d of sorted) {
      const ref = doc(shares);
      await setDoc(ref, { userId: user.uid, title: d.title, data: d.data, folderShareId: index.id, createdAt: serverTimestamp() });
      written.push(ref.id);
      items.push({ id: ref.id, title: d.title, exercise: d.data.record.exercise_number ?? "", date: d.data.record.date ?? "" });
      onProgress?.(items.length);
    }
    await setDoc(index, {
      userId: user.uid,
      title: folder.name,
      kind: "folder",
      data: { name: folder.name, template: folder.template ?? null, layoutMode: folder.layoutMode ?? "default", items },
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    await Promise.allSettled(written.map((id) => deleteDoc(doc(getDb(), COLLECTION, id))));
    throw err;
  }
  return folderShareUrl(index.id);
}

/** Reads a folder link; null when it is unknown or was removed. */
export async function loadFolderShare(id: string): Promise<SharedFolder | null> {
  const snap = await getDoc(doc(getDb(), COLLECTION, id));
  if (!snap.exists() || snap.data().kind !== "folder") return null;
  const data = snap.data().data as Partial<SharedFolder> | undefined;
  if (!data || !Array.isArray(data.items)) return null;
  return {
    name: String(data.name || "Shared folder"),
    template: sanitizeTemplate(data.template),
    layoutMode: data.layoutMode === "programming" || data.layoutMode === "custom" ? data.layoutMode : "default",
    items: data.items.filter((i) => i && typeof i.id === "string"),
  };
}

/** Removes the record snapshots behind a folder link (the index itself is deleted by the caller). */
export async function deleteFolderShareItems(userId: string, indexId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(getDb(), COLLECTION), where("userId", "==", userId), where("folderShareId", "==", indexId))
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
