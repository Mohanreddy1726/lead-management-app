import AppShell from "@/components/layout/AppShell";

export default function AdmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
