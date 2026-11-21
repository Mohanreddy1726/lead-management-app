import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Automation — Lead.OS",
  description: "Workflow automation, trigger-based actions, SLA alerts, and automatic lead distribution.",
};

export default function AutomationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
