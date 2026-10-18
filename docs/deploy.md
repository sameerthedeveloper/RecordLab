# Deploying Record Lab (Vercel + Firebase)

The app is a Next.js 14 project. A production build from a clean checkout passes (`npm ci && npx next build`).

## 1. Environment variables (Vercel → Settings → Environment Variables)

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | sign-in, cloud files, admin | from Firebase console → Project settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | sign-in | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | everything Firebase | also used by `/api/admin/*` to check admins |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase | |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | analytics (optional) | |
| `GMAIL_CLIENT_ID` | Send mail | OAuth client (Web application). See `docs/admin-mail.md` |
| `GMAIL_CLIENT_SECRET` | Send mail | server only, never prefix with `NEXT_PUBLIC_` |
| `GMAIL_REFRESH_TOKEN` | Send mail | server only. Get it locally from `/api/admin/mail-token` |
| `MAIL_SENDER` | Send mail | the Workspace address that granted the token |
| `MAIL_SENDER_NAME` | Send mail (optional) | default `Record Lab` |
| `MAIL_REPLY_TO` | Send mail (optional) | where replies go |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | real ads (optional) | without them the placeholders show |

Set them for **Production** (and Preview if you test there). Variables that start with `NEXT_PUBLIC_` are public by design;
the `GMAIL_*` and `MAIL_*` ones stay on the server. Redeploy after changing any of them.

## 2. Firebase (do these before the first real use)

1. **Authentication → Settings → Authorized domains**: add your Vercel domain (and any custom domain).
2. **Authentication → Sign-in method**: enable Google and Email/Password.
3. **Firestore rules**: `firebase deploy --only firestore:rules` (the file is `firestore.rules`). Needed for cloud files,
   share links, colleges, the admin panel and admin hand-over.
4. **First admin**: Firestore → create collection `admins` → document id = your Firebase UID (shown on `/admin` when you
   are signed in but not an admin; any one field, e.g. `role: admin`). After that, admins are managed in `/admin/admins`.

## 3. Google Cloud (Send mail only)

- Enable the Gmail API; create an OAuth client of type **Web application**.
- For minting the refresh token locally add the redirect URI `http://localhost:3000/api/admin/mail-token`, run
  `npm run dev`, open that URL, sign in as the sender, and copy the two lines it shows into Vercel.
- The helper returns 404 in production on purpose.
- Rotate the client secret if it was ever pasted into chat, a ticket or a screenshot.

## 4. Before each release

```bash
npm ci
npx tsc --noEmit
npx next lint
npx next build
```

## 5. After deploying, check

- `/` loads, `/editor` opens a fresh sheet, Python runs (first run downloads the runtime from jsDelivr).
- Sign in with Google and with email; Save to cloud works; a share link opens in a private window.
- `/admin` signed out shows only a sign-in card; as a non-admin it shows 404; as an admin it loads the dashboard.
- `/admin/mail` → "Send a test to me" arrives, with the logo.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt` respond; Search Console still verifies the site.
- Install the PWA on a phone; turn on airplane mode and open it (offline page and editor).

## Known notes

- The marketing and app pages are static; only `/api/admin/*` run as serverless functions.
- No Content-Security-Policy yet (see the comment in `next.config.mjs`). Add one in report-only mode first.
- Admins can read all saved records (`firestore.rules`); the landing FAQ and `llms.txt` say so.
