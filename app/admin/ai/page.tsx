import { Suspense } from "react";
import type { Metadata } from "next";
import { AiPage } from "@/components/admin/AiPage";

export const metadata: Metadata = { title: "AI · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <AiPage />
    </Suspense>
  );
}
