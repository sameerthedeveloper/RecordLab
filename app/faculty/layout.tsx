import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FacultyProvider } from "@/components/faculty/FacultyProvider";
import { FacultyShell } from "@/components/faculty/FacultyShell";
import { FACULTY_WIRED } from "@/lib/facultyFlag";

export const metadata: Metadata = {
  title: "Faculty desk · Record Lab",
  robots: { index: false, follow: false, nocache: true },
};

/** Everything under /faculty: signed-in, admin-approved faculty only, in a frame of its own. */
export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  if (!FACULTY_WIRED) redirect("/");
  return (
    <FacultyProvider>
      <FacultyShell>{children}</FacultyShell>
    </FacultyProvider>
  );
}
