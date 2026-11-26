import { redirect } from "next/navigation";

// Billing is unwired (see docs/billing.md). components/admin/BillingPage.tsx is kept for rewiring.
export default function Page() {
  redirect("/admin");
}
