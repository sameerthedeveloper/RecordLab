// Creates (or resets) a login for Razorpay's reviewers, so they can open Record Lab and walk through the payment flow.
//
//   npm run razorpay:reviewer                       random password, razorpay.reviewer@recordlab.test
//   npm run razorpay:reviewer -- --email a@b.com --password 'Secret123!'
//   npm run razorpay:reviewer -- --pro 30           also give 30 days of Pro (skip it: they see the free plan and the pay button)
//
// Reads FIREBASE_SERVICE_ACCOUNT from .env.local (plain JSON or base64), the same variable the server uses.
import { randomBytes } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const email = opt("email", "razorpay.reviewer@recordlab.test").toLowerCase();
const password = opt("password", `Rl-${randomBytes(6).toString("base64url")}9!`);
const proDays = Number(opt("pro", 0));

const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set. Run through npm so .env.local is loaded: npm run razorpay:reviewer");
  process.exit(1);
}
const sa = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key.replace(/\\n/g, "\n") }) });
const auth = getAuth(app);

let user;
try {
  user = await auth.getUserByEmail(email);
  user = await auth.updateUser(user.uid, { password, emailVerified: true, displayName: "Razorpay Reviewer", disabled: false });
  console.log("Existing reviewer account reset.");
} catch (e) {
  if (e?.code !== "auth/user-not-found") throw e;
  user = await auth.createUser({ email, password, emailVerified: true, displayName: "Razorpay Reviewer" });
  console.log("Reviewer account created.");
}

const db = getFirestore(app);
const sub = db.doc(`subscriptions/${user.uid}`);
if (proDays > 0) {
  await sub.set({ plan: proDays >= 180 ? "year" : "month", expiresAt: Timestamp.fromDate(new Date(Date.now() + proDays * 86_400_000)), source: "reviewer", updatedAt: FieldValue.serverTimestamp() });
  console.log(`Pro granted for ${proDays} days.`);
} else {
  await sub.delete(); // a clean free account, so the upgrade and pay flow is visible
}

console.log(`\n  Email:    ${email}\n  Password: ${password}\n  uid:      ${user.uid}\n\nGive these to Razorpay with the site URL. Delete the user in Firebase Auth when review is done.`);
