"use client";

import { GoogleAuthProvider, linkWithPopup, reauthenticateWithPopup, type User } from "firebase/auth";

/**
 * Google Drive link. Uses the narrow `drive.file` scope, so RecordLab can only
 * see the files and folders it creates itself, never the rest of the Drive.
 * The access token lasts about an hour and lives in memory only; the "linked"
 * flag is remembered per user so the explorer can offer a one-click reconnect.
 */
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const ROOT_NAME = "RecordLab";
const FLAG = (uid: string) => `recordlab.drive.${uid}`;
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

let token: { value: string; expires: number } | null = null;

export function isDriveLinked(uid: string): boolean {
  try {
    return localStorage.getItem(FLAG(uid)) === "1";
  } catch {
    return false;
  }
}

export function hasDriveToken(): boolean {
  return !!token && token.expires > Date.now();
}

export function unlinkDrive(uid: string): void {
  token = null;
  try {
    localStorage.removeItem(FLAG(uid));
  } catch {}
}

/** Opens Google's consent popup. Call straight from a click handler (popups need the gesture). */
export async function connectDrive(user: User): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.addScope(SCOPE);
  provider.setCustomParameters({ prompt: "consent", ...(user.email ? { login_hint: user.email } : {}) });
  const hasGoogle = user.providerData.some((p) => p.providerId === "google.com");
  let credential;
  try {
    credential = hasGoogle ? await reauthenticateWithPopup(user, provider) : await linkWithPopup(user, provider);
  } catch (err) {
    // Already linked on another sign-in: a re-auth gets the same token.
    if ((err as { code?: string }).code === "auth/provider-already-linked") {
      credential = await reauthenticateWithPopup(user, provider);
    } else throw err;
  }
  const value = GoogleAuthProvider.credentialFromResult(credential)?.accessToken;
  if (!value) throw new Error("Google did not return Drive access.");
  token = { value, expires: Date.now() + 55 * 60_000 };
  try {
    localStorage.setItem(FLAG(user.uid), "1");
  } catch {}
}

async function api(path: string, init: RequestInit = {}, base = API): Promise<Response> {
  if (!hasDriveToken()) throw new DriveAuthError();
  const res = await fetch(base + path, {
    ...init,
    headers: { Authorization: `Bearer ${token!.value}`, ...(init.headers ?? {}) },
  });
  if (res.status === 401 || res.status === 403) {
    if (res.status === 401) token = null;
    const body = await res.json().catch(() => null);
    const reason = body?.error?.errors?.[0]?.reason as string | undefined;
    if (res.status === 401) throw new DriveAuthError();
    if (reason === "accessNotConfigured") {
      // Google's message names the exact project and gives the enable link.
      const project = /project[= ](\d+)/.exec(body?.error?.message ?? "")?.[1];
      throw new Error(
        project
          ? `Turn on the Google Drive API for project ${project} (console.cloud.google.com/apis/library/drive.googleapis.com?project=${project}), then retry.`
          : "Turn on the Google Drive API for this project, then retry.",
      );
    }
    throw new Error(body?.error?.message ?? "Google Drive refused the request.");
  }
  if (!res.ok) throw new Error(`Google Drive error (${res.status}).`);
  return res;
}

/** The token expired or was never granted: the caller should run connectDrive again. */
export class DriveAuthError extends Error {
  constructor() {
    super("Reconnect Google Drive to continue.");
  }
}

const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findOrCreateFolder(name: string, parent: string | null): Promise<string> {
  const query = `name='${q(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parent ?? "root"}' in parents`;
  const found = await (await api(`/files?fields=files(id)&pageSize=1&q=${encodeURIComponent(query)}`)).json();
  if (found.files?.[0]?.id) return found.files[0].id as string;
  const created = await (
    await api("/files?fields=id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parent ? { parents: [parent] } : {}),
      }),
    })
  ).json();
  return created.id as string;
}

export interface DriveUploadResult {
  id: string;
  link: string;
}

/** Puts a PDF in RecordLab/<subject> (or RecordLab for unfiled), replacing an earlier upload of the same name. */
export async function uploadPdfToDrive(blob: Blob, filename: string, subject: string | null): Promise<DriveUploadResult> {
  const root = await findOrCreateFolder(ROOT_NAME, null);
  const parent = subject ? await findOrCreateFolder(subject, root) : root;

  const existing = await (
    await api(`/files?fields=files(id)&pageSize=1&q=${encodeURIComponent(`name='${q(filename)}' and trashed=false and '${parent}' in parents`)}`)
  ).json();
  const existingId = existing.files?.[0]?.id as string | undefined;

  const meta = existingId ? { name: filename } : { name: filename, parents: [parent] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", blob);
  const res = await api(
    `${existingId ? `/${existingId}` : ""}?uploadType=multipart&fields=id,webViewLink`,
    { method: existingId ? "PATCH" : "POST", body: form },
    UPLOAD,
  );
  const out = await res.json();
  return { id: out.id, link: out.webViewLink };
}

export async function openDriveFolder(): Promise<string> {
  const id = await findOrCreateFolder(ROOT_NAME, null);
  return `https://drive.google.com/drive/folders/${id}`;
}
