import AppShell from "@/components/layout/AppShell";

export default function CounsellingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
