# Paid plans (Razorpay) and the faculty switch

## What it does
- **Free**: up to 15 cloud records per account (the number is editable in Admin > Billing). Everything else in Record Lab stays free.
- **Pro**: unlimited cloud records. Bought as a one-time payment for 1 month (30 days) or 1 year (365 days). No auto-renewal; buying again while Pro adds to the end date.
- **Off by default.** Until an admin switches "Charge for Pro" on in Admin > Billing, nothing is limited. Existing records are never deleted; a full free account just cannot create new ones.
- The limit is checked in the browser (`assertCanCreateRecord` in `lib/billing.ts`), because Firestore rules cannot count documents. Subscriptions themselves can only be written by the server.

## Faculty switch
Admin > Faculty > **Let faculty sign in**. Off: `/faculty` shows a pause notice to everyone (even signed out), and the rules refuse faculty creating classes, editing experiments, reviewing, or reading submitted records. Students, records and submissions are untouched; turning it on restores everything. Stored at `config/app`.

## Setup (once)
1. `firebase deploy --only firestore:rules` (adds `config/app`, `config/billing`, `subscriptions`, `payments`).
2. Razorpay dashboard > Settings > API keys: generate a key (use **Test mode** first). Set on the server:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxx
   RAZORPAY_KEY_SECRET=xxx
   ```
3. Firebase console > Project settings > Service accounts > Generate new private key. Put the whole JSON (or its base64) in:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```
   This is what lets the server write `subscriptions/<uid>` after a payment. Never commit it.
4. Razorpay > Settings > Webhooks > Add: URL `https://<your-domain>/api/billing/webhook`, events **payment.captured** and **order.paid**, and a secret. Set the same secret as:
   ```
   RAZORPAY_WEBHOOK_SECRET=xxx
   ```
   The webhook credits a payment even if the buyer closes the tab before the browser can confirm it.
5. Admin > Billing shows a checklist of which of these the server can see. Set prices, then switch **Charge for Pro** on.
6. Test with Razorpay test cards/UPI, then swap in live keys.

## How a payment flows
1. `POST /api/billing/order`: checks the sign-in, prices the plan **on the server** from `config/billing`, creates a Razorpay order tagged with the uid and plan.
2. Razorpay Checkout opens in the browser.
3. `POST /api/billing/verify`: checks Razorpay's signature, checks the order belongs to the caller, then `activateOrder` extends `subscriptions/<uid>`.
4. The webhook runs the same `activateOrder`. The payment id is stored once in `payments/<id>` inside a transaction, so confirming twice never adds time twice.

## Files
`lib/billingShared.ts` (types, prices) · `lib/billing.ts` (browser: limit check, checkout) · `lib/server/{razorpay,billing,firebaseAdmin}.ts` · `app/api/billing/*` · `components/UpgradeModal.tsx` · `components/admin/BillingPage.tsx` · `lib/appConfig.ts` (faculty switch).

## Promo codes (free Pro for one person)
Admin > Billing > **Promo codes**: enter an email, how long Pro lasts (1 week to 1 year), and how long they have to redeem it (3 days to 1 month), optionally a message. The code (`RL-XXXX-XXXX`) is emailed to them with the existing Gmail setup (docs/admin-mail.md); if mail isn't set up you can copy it and send it yourself.
- The code works **only for a person signed in with that email address**, once, and only before its redeem-by date. Expired and used codes stay in the list. Unused ones can be resent or deleted.
- Redeeming adds the code's days to the end of any Pro they already have. They enter it in the account menu > **Redeem promo code** (or **Pro plan** / **Upgrade to Pro**) > "Have a promo code?". It works even while "Charge for Pro" is off.
- Stored in `promoCodes/<code>`, written only by the server (`/api/admin/promo`, `/api/billing/redeem`). Needs the same `FIREBASE_SERVICE_ACCOUNT` as payments, and the updated `firestore.rules` for the admin list.
