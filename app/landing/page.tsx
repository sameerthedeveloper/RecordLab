import { redirect } from "next/navigation";

/** The landing page is the home page now; keep old /landing links working. */
export default function LegacyLandingRedirect() {
  redirect("/");
}
