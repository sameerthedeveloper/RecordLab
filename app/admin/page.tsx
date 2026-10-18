import { Suspense } from "react";
import type { Metadata } from "next";
import { OverviewPage } from "@/components/admin/OverviewPage";

export const metadata: Metadata = { title: "Overview · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <OverviewPage />
    </Suspense>
  );
}
