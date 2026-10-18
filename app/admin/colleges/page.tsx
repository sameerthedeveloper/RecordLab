import { Suspense } from "react";
import type { Metadata } from "next";
import { CollegesPage } from "@/components/admin/CollegesPage";

export const metadata: Metadata = { title: "Colleges · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <CollegesPage />
    </Suspense>
  );
}
