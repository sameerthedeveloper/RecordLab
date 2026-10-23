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


## Admin area, access and handing over admin access

Everything under `/admin` (Overview, Users, Records, Colleges, Send mail, Admins) is one protected area. A visitor who is
not signed in sees only a sign-in card; a signed-in person who is not an admin sees a plain 404. The data behind it is
protected separately: the Firestore rules decide who may read, and `/api/admin/*` checks the caller on the server.

### Rules needed for the Admins page (add to `firestore.rules`, then deploy)

Replace the `match /admins/{uid}` block with this so an admin can see the admin list, add another admin and give up
their own access. Nobody can remove someone else, and the first admin is still created by hand in the Firebase console.

```
match /admins/{uid} {
  allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
  allow create: if isAdmin();
  allow delete: if isAdmin() && request.auth.uid == uid;
  allow update: if false;
}
```

Then `firebase deploy --only firestore:rules`. Until it is deployed, the Admins page shows "Couldn't read the admin list".

### Transferring admin access

Admin → **Admins**: pick a user who has signed in, then **Add as admin** (they get the same access) or **Transfer my
access** (they become admin and yours is removed in one step, so there is never a time with no admin). **Step down**
removes only your own access and is disabled while you are the only admin.
