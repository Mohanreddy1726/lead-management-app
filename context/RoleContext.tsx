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
  
  // Base account role from session, defaulting to admin if not set
  const sessionRole = ((session?.user as any)?.role?.toLowerCase() as AppRole) || "admin";
  const actualRole: AppRole = ["admin", "manager", "telecaller"].includes(sessionRole)
    ? sessionRole
    : "admin";

  // Current active viewing role
  const [currentRole, setCurrentRole] = useState<AppRole>(actualRole);

  // Sync initial role when session loads
  useEffect(() => {
    const saved = localStorage.getItem("leados_view_role") as AppRole | null;
    if (saved && ["admin", "manager", "telecaller"].includes(saved)) {
      // Validate that saved role is permitted for actualRole
      if (actualRole === "admin") {
        setCurrentRole(saved);
      } else if (actualRole === "manager" && (saved === "manager" || saved === "telecaller")) {
        setCurrentRole(saved);
      } else {
        setCurrentRole(actualRole);
      }
    } else {
      setCurrentRole(actualRole);
    }
  }, [actualRole]);

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
