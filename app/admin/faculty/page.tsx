import { Suspense } from "react";
import type { Metadata } from "next";
import { FacultyPage } from "@/components/admin/FacultyPage";

export const metadata: Metadata = { title: "Faculty · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <FacultyPage />
    </Suspense>
  );
}
