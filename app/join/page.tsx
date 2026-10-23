import type { Metadata } from "next";
import { JoinCodeForm } from "@/components/JoinCodeForm";

export const metadata: Metadata = {
  title: "Join a class · Record Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <JoinCodeForm />;
}
