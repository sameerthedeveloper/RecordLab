import { Suspense } from "react";
import type { Metadata } from "next";
import { RecordsPage } from "@/components/admin/RecordsPage";

export const metadata: Metadata = { title: "Records · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <RecordsPage />
    </Suspense>
  );
}
