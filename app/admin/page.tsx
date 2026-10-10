import type { Metadata } from "next";
import { AdminClient } from "@/components/AdminClient";

export const metadata: Metadata = {
  title: "Usage — Record Lab admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
