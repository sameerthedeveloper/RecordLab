# Sending mail from the admin panel

The **Send mail** tab sends a message from your Google Workspace address through the Gmail API.
Nothing is sent from the browser: the dashboard calls `/api/admin/send-mail`, which checks the caller
is an admin (their ID token, then `admins/<uid>` read under the Firestore rules) and only then sends.

## One-time setup (about 10 minutes)

1. **Google Cloud console** (use the same Google account as the Workspace sender): create or pick a project, then
   **APIs & Services → Library → Gmail API → Enable**.
2. **OAuth consent screen**: user type **Internal** if the Workspace allows it (no verification needed), otherwise External + Testing with your sender as a test user.
   Add the scope `https://www.googleapis.com/auth/gmail.send`.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   Add `https://developers.google.com/oauthplayground` as an authorised redirect URI. Copy the client ID and secret.
4. Open **https://developers.google.com/oauthplayground**, click the gear, tick **Use your own OAuth credentials**, paste the client ID and secret.
   In step 1 enter the scope `https://www.googleapis.com/auth/gmail.send`, authorise **signed in as the sender address**, then **Exchange authorization code for tokens**.
   Copy the **refresh token**.
5. Add these environment variables (Vercel → Settings → Environment Variables, and `.env.local` for local runs), then redeploy:

```
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
MAIL_SENDER=you@yourworkspace.com        # the account that granted the token
MAIL_SENDER_NAME=Record Lab              # optional, shown as the sender name
MAIL_REPLY_TO=you@yourworkspace.com      # optional
```

Open **/admin → Send mail**. The card shows "From <your address>" when it is connected.

## Using it

- Pick who gets it (everyone, active this week, new this week, one college, or just you) and write the message.
- `{{name}}` becomes each person's first name (or "there" if they have none).
- Always send to **Just me (test)** first.
- Messages go out one per person, so nobody sees anyone else's address. Up to 50 per request, sent in batches.

## Limits and good practice

- Workspace accounts can send about **2,000 messages a day** (Gmail API). Bigger lists should be split over days.
- Mail from a Workspace address is real email: keep it relevant, say who you are, and include a way to reply.
  Users did not opt in to a newsletter, so keep to service messages (updates, fixes, support).
- If the refresh token is revoked or the app is in "Testing" (tokens last 7 days), create a new token.
