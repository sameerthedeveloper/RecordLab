import { SITE_URL } from "./site";
import { firstName } from "./adminFormat";

/** The welcome email's subject, text (also the plain-text part) and button. Same blocks the admin mail uses. */
export function welcomeMail(name: string | null | undefined) {
  const first = firstName(name);
  return {
    subject: first ? `Welcome to Record Lab, ${first}` : "Welcome to Record Lab",
    text: [
      first ? `Hi ${first},` : "Hi,",
      "Your Record Lab account is ready. Here is how to get your first lab record done in a few minutes:",
      [
        "1. Open the editor and fill in your record details: college, subject, exercise and date.",
        "2. Write the aim and procedure, or let the AI helper draft them: copy the prompt, paste the answer back.",
        "3. Paste your code and run it. The output is captured for you.",
        "4. Check the live preview, then export a clean, print-ready PDF.",
      ].join("\n"),
      "Sign in to save records to your account and open them on any device. Everything stays private to you unless you share a link.",
      "If you get stuck, just reply to this email.",
    ].join("\n\n"),
    cta: { label: "Open the editor", url: `${SITE_URL}/editor` },
  };
}
