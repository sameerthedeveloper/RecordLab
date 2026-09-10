import type { RlabPayload } from "./firestoreService";

/**
 * One-shot handoff for "Load into Editor" from the dashboard: the dashboard
 * writes the payload here and navigates to "/", which reads and clears it on
 * mount. Session-scoped since it's only ever meant to survive one navigation.
 */
const BRIDGE_KEY = "recordlab:cloud-load";

export function stashCloudLoad(payload: RlabPayload): void {
  sessionStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
}

export function consumeCloudLoad(): RlabPayload | null {
  const raw = sessionStorage.getItem(BRIDGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(BRIDGE_KEY);
  try {
    return JSON.parse(raw) as RlabPayload;
  } catch {
    return null;
  }
}
