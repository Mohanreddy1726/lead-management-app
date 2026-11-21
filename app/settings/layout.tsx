import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Settings & Workstation Preferences — Lead.OS",
  description: "Personalize your dialer setup, call scripts, quick response templates, audio alerts, and workspace display.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
