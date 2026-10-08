import type { Metadata } from "next";
import { DashboardPageClient } from "@/components/DashboardPageClient";

export const metadata: Metadata = {
  title: "My records — Record Lab",
  description: "Every lab record you've saved to the cloud, in one place.",
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
