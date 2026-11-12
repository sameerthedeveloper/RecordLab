import { Suspense } from "react";
import type { Metadata } from "next";
import { BillingPage } from "@/components/admin/BillingPage";

export const metadata: Metadata = { title: "Billing · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <BillingPage />
    </Suspense>
  );
}
