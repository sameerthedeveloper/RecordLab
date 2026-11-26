import type { Metadata } from "next";
import { SharedFolderClient } from "@/components/SharedFolderClient";

export const metadata: Metadata = {
  title: "Shared folder · Record Lab",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SharedFolderClient id={id} />;
}
