import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Analytics — Lead.OS",
  description: "Advanced analytics on funnel velocity, lead score distribution, call effectiveness, and geographic cohorts.",
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
