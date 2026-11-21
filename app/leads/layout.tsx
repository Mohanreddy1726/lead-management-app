import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">Loading leads…</div>
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
