"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebaseConfig";
import { DEFAULT_AI_CONFIG, sanitizeAiConfig, type AiConfig } from "./aiConfigShared";

const ref = () => doc(getDb(), "config", "ai");
let cached: { at: number; value: AiConfig } | null = null;

/** The admin's AI settings, cached for 30 seconds. Unreadable or missing: the defaults (everything on). */
export async function loadAiConfig(): Promise<AiConfig> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value;
  let value = DEFAULT_AI_CONFIG;
  try {
    const snap = await getDoc(ref());
    if (snap.exists()) value = sanitizeAiConfig(snap.data());
  } catch {
    /* keep the defaults */
  }
  cached = { at: Date.now(), value };
  return value;
}

/** Live AI settings for the screen (null until the first read). */
export function useAiConfig(): AiConfig | null {
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  useEffect(
    () =>
      onSnapshot(
        ref(),
        (snap) => setCfg(snap.exists() ? sanitizeAiConfig(snap.data()) : DEFAULT_AI_CONFIG),
        () => setCfg(DEFAULT_AI_CONFIG)
      ),
    []
  );
  return cfg;
}

/** Admins only (the rules refuse anyone else). */
export async function saveAiConfig(next: AiConfig, adminUid: string): Promise<void> {
  const clean = sanitizeAiConfig({ ...next });
  await setDoc(ref(), { ...clean, updatedBy: adminUid, updatedAt: serverTimestamp() });
  cached = { at: Date.now(), value: clean };
}
