import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Campaigns — Lead.OS",
  description: "Campaign performance from spend to admissions, with the full funnel for each campaign.",
};

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
