import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — Record Lab",
  description: "Lab records for every department: write, run your code, and export a print-ready fair copy.",
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
