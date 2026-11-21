import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Lead Sources — Lead.OS",
  description: "Manage and compare lead sources: website, Meta Ads, Google Ads, WhatsApp, manual and CSV import.",
};

export default function SourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
