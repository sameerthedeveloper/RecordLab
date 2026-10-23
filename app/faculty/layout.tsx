import type { Metadata } from "next";
import { FacultyProvider } from "@/components/faculty/FacultyProvider";
import { FacultyShell } from "@/components/faculty/FacultyShell";

export const metadata: Metadata = {
  title: "Faculty desk · Record Lab",
  robots: { index: false, follow: false, nocache: true },
};

/** Everything under /faculty: signed-in, admin-approved faculty only, in a frame of its own. */
export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <FacultyProvider>
      <FacultyShell>{children}</FacultyShell>
    </FacultyProvider>
  );
}
