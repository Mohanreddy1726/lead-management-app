import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Lead Assignment — Lead.OS",
  description: "Configure manual, round robin, least-assigned, source-based and location-based assignment rules.",
};

export default function AssignmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
