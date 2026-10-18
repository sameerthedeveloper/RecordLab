import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminsPage } from "@/components/admin/AdminsPage";

export const metadata: Metadata = { title: "Admins · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <AdminsPage />
    </Suspense>
  );
}
