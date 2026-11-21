import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Audit Log — Lead.OS",
  description: "Immutable compliance audit trail of user actions, lead status transitions, and system changes.",
};

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
