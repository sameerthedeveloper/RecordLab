import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordClient } from "@/components/ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset password — Record Lab",
  description: "Choose a new password for your Record Lab account.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}
