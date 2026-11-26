import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinClassClient } from "@/components/JoinClassClient";
import { FACULTY_WIRED } from "@/lib/facultyFlag";

export const metadata: Metadata = {
  title: "Join a class · Record Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (!FACULTY_WIRED) redirect("/");
  return <JoinClassClient />;
}
