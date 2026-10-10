import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — Record Lab",
  description: "Type your lab record once and export a print-ready fair copy.",
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
