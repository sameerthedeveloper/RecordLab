import type { Metadata } from "next";
import { JoinClassClient } from "@/components/JoinClassClient";

export const metadata: Metadata = {
  title: "Join a class · Record Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <JoinClassClient />;
}
