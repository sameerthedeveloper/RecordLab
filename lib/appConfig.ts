"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebaseConfig";

/** Switches only admins flip, stored at config/app. Anyone may read it (it is two yes/no answers), so /faculty can say "paused" before sign-in. */
export interface AppConfig {
  /** Faculty sign-in and the faculty desk. Off: /faculty shows a pause notice and the rules refuse faculty writes. */
  facultyEnabled: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfig = { facultyEnabled: true };

const ref = () => doc(getDb(), "config", "app");

/** Live app switches (null until the first read). Unreadable or missing: everything on. */
export function useAppConfig(): AppConfig | null {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  useEffect(
    () =>
      onSnapshot(
        ref(),
        (snap) => setCfg({ facultyEnabled: snap.exists() ? snap.data().facultyEnabled !== false : true }),
        () => setCfg(DEFAULT_APP_CONFIG)
      ),
    []
  );
  return cfg;
}

/** Admins only (the rules refuse anyone else). */
export async function saveAppConfig(next: AppConfig, adminUid: string): Promise<void> {
  await setDoc(ref(), { facultyEnabled: next.facultyEnabled, updatedBy: adminUid, updatedAt: serverTimestamp() });
}
