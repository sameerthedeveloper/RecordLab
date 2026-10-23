import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Record Lab admin",
  robots: { index: false, follow: false, nocache: true },
};

/** Everything under /admin: signed-in admins only, in a frame of its own (no student-app chrome). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
