import { Suspense } from "react";
import type { Metadata } from "next";
import { MailPage } from "@/components/admin/MailPage";

export const metadata: Metadata = { title: "Send mail · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <MailPage />
    </Suspense>
  );
}
