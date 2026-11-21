"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export type AppRole = "admin" | "manager" | "telecaller";

interface RoleContextType {
  actualRole: AppRole;
  currentRole: AppRole;
  availableRoles: AppRole[];
  switchRole: (role: AppRole) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Base account role from authenticated session (defaults to least-privilege 'telecaller' if not signed in)
  const userRole = ((session?.user as any)?.actualRole || (session?.user as any)?.role)?.toLowerCase();
  const actualRole: AppRole =
    userRole && ["admin", "manager", "telecaller"].includes(userRole)
      ? (userRole as AppRole)
      : "telecaller";

  // Current active viewing role
  const [currentRole, setCurrentRole] = useState<AppRole>(actualRole);

  // Determine which roles this user can switch to
  const availableRoles: AppRole[] = React.useMemo(() => {
    if (actualRole === "admin") {
      return ["admin", "manager", "telecaller"];
    }
    if (actualRole === "manager") {
      return ["manager", "telecaller"];
    }
    return ["telecaller"];
  }, [actualRole]);

  // Sync role when session loads or changes
  useEffect(() => {
    const saved = localStorage.getItem("leados_view_role") as AppRole | null;
    if (saved && availableRoles.includes(saved)) {
      setCurrentRole(saved);
    } else {
      setCurrentRole(actualRole);
    }
  }, [actualRole, availableRoles]);

  const switchRole = (newRole: AppRole) => {
    if (availableRoles.includes(newRole)) {
      setCurrentRole(newRole);
      localStorage.setItem("leados_view_role", newRole);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        actualRole,
        currentRole,
        availableRoles,
        switchRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
