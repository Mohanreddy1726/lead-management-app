import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Reports & Analytics — Lead.OS",
  description: "Comprehensive reporting on lead acquisition, conversions, marketing ROI, and admissions.",
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
