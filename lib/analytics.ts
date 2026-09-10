import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "./firebaseConfig";

/**
 * Usage-tracking events for pitching Record Lab — which features people
 * actually reach for (local vs. cloud save, export format, AI assist, etc).
 * Fire-and-forget: never awaited by callers, never throws, and silently
 * no-ops when analytics isn't configured/supported (see getFirebaseAnalytics).
 */
export function track(eventName: string, params?: Record<string, string | number | boolean>): void {
  getFirebaseAnalytics()
    .then((analytics) => {
      if (analytics) logEvent(analytics, eventName, params);
    })
    .catch(() => {});
}
