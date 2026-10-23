import { Suspense } from "react";
import type { Metadata } from "next";
import { UsersPage } from "@/components/admin/UsersPage";

export const metadata: Metadata = { title: "Users · Record Lab admin" };

export default function Page() {
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
