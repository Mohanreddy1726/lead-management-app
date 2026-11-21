import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Campaign Analytics — Lead.OS",
  description: "Marketing campaign attribution, cost per lead, admission acquisition costs, and ROAS performance.",
};

export default function CampaignAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
