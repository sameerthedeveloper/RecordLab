import { BootSplash } from "@/components/BootSplash";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BootSplash label="Opening your records" />
    </>
  );
}
