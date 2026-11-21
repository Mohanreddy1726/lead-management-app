"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { RoleProvider } from "@/context/RoleContext";
import { BranchProvider } from "@/context/BranchContext";

// Protect against NextAuth v4 multi-tab getSession broadcast ping-pong loop
if (typeof window !== "undefined") {
  const g = window as any;
  if (!g.__nextauth_loop_patched) {
    g.__nextauth_loop_patched = true;

    try {
      const origSetItem = localStorage.setItem;
      localStorage.setItem = function (key: string, value: string) {
        if (key === "nextauth.message") {
          try {
            const parsed = JSON.parse(value);
            // Block getSession read triggers from broadcasting to other tabs
            if (parsed?.data?.trigger === "getSession") {
              return;
            }
          } catch {}
        }
        return origSetItem.call(this, key, value);
      };

      const origAdd = window.addEventListener.bind(window);
      window.addEventListener = function (type: string, listener: any, options?: any) {
        if (type === "storage" && typeof listener === "function") {
          const wrapped = function (e: any) {
            if (e?.key === "nextauth.message") {
              try {
                const parsed = JSON.parse(e.newValue || "{}");
                if (parsed?.data?.trigger === "getSession") {
                  return;
                }
              } catch {}
            }
            return listener(e);
          };
          return origAdd(type, wrapped as EventListener, options);
        }
        return origAdd(type, listener, options);
      };
    } catch {}
  }
}

export default function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session?: any;
}) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <RoleProvider>
        <BranchProvider>
          {children}
          <Toaster position="top-right" richColors />
        </BranchProvider>
      </RoleProvider>
    </SessionProvider>
  );
}
