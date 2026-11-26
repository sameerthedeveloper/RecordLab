import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FacultyPage } from "@/components/admin/FacultyPage";
import { FACULTY_WIRED } from "@/lib/facultyFlag";

export const metadata: Metadata = { title: "Faculty · Record Lab admin" };

export default function Page() {
  if (!FACULTY_WIRED) redirect("/admin");
  return (
    <Suspense>
      <FacultyPage />
    </Suspense>
  );
}
