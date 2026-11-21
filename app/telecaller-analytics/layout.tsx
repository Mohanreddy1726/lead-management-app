import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Telecaller Analytics — Lead.OS",
  description: "Workforce productivity, call duration, connection rates, and counsellor conversion metrics.",
};

export default function TelecallerAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
