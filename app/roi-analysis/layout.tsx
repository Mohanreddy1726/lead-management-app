import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "ROI & Unit Economics Analysis — Lead.OS",
  description: "Customer acquisition cost (CAC), lifetime value (LTV), channel payback periods, and destination profitability.",
};

export default function RoiAnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
