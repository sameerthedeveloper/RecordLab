# Admin usage panel

`/admin` shows how Record Lab is used: users, active users, actions per day, which features
are used, and a searchable user list. It is not linked from the app.

## What it reads
- `stats/<YYYY-MM-DD>` and `stats/_all`: per-event counters, bumped by `track()` for signed-in users. No user ids, no record content.
- `profiles/<uid>`: email, display name, sign-in method, join date, last seen. Written once per browser session by the account menu.

Admins **cannot** read `documents` (records) or `users` (settings, RRN, Puter link). That is deliberate.

## Setup (once)
1. Deploy the rules: `firebase deploy --only firestore:rules`.
2. Find your uid: sign in, open `/admin`. The "No access" card shows it.
3. In the Firebase console → Firestore, create a document at `admins/<your uid>` (any field, e.g. `role: "owner"`).
4. Reload `/admin`.

To remove an admin, delete their `admins/<uid>` document.

## Limits
- Signed-out usage is not counted here. Firebase Analytics (already wired in `lib/analytics.ts`) covers it in the Firebase console.
- Counts start from deployment; nothing is back-filled.
- Users appear after their next sign-in (that is when their profile row is written).
