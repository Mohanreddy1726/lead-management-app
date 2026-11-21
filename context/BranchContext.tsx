"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRole } from "./RoleContext";
import { toast } from "sonner";
import type { Branch } from "@/data/types";

interface BranchContextType {
  branch: Branch;
  canSwitchBranch: boolean;
  switchBranch: (newBranch: Branch) => void;
  toggleBranch: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { actualRole, currentRole } = useRole();

  const [branch, setBranchState] = useState<Branch>("mbbs");

  // Determine user branch from session or role
  const sessionBranch = ((session?.user as any)?.branch?.toLowerCase() as Branch) || null;

  // Admin can always switch between MBBS and Masters
  // If user is logged in as a specific division manager/telecaller, they are locked to that division
  const isLockedToBranch = actualRole !== "admin" && sessionBranch !== null;
  const canSwitchBranch = actualRole === "admin";

  useEffect(() => {
    if (isLockedToBranch && sessionBranch) {
      setBranchState(sessionBranch);
    } else {
      const saved = localStorage.getItem("leados_branch") as Branch | null;
      if (saved && (saved === "mbbs" || saved === "masters")) {
        setBranchState(saved);
      }
    }
  }, [isLockedToBranch, sessionBranch]);

  const switchBranch = (newBranch: Branch) => {
    if (!canSwitchBranch && isLockedToBranch) {
      toast.error(`Access restricted: You are assigned to the ${sessionBranch?.toUpperCase()} division.`);
      return;
    }
    setBranchState(newBranch);
    localStorage.setItem("leados_branch", newBranch);
    toast.info(`Switched to ${newBranch === "masters" ? "🎓 Masters Abroad" : "🩺 MBBS Abroad"} Division`, {
      description: `Viewing ${newBranch === "masters" ? "Masters" : "MBBS"} leads, campaigns, and team members.`,
    });
  };

  const toggleBranch = () => {
    switchBranch(branch === "mbbs" ? "masters" : "mbbs");
  };

  return (
    <BranchContext.Provider
      value={{
        branch,
        canSwitchBranch,
        switchBranch,
        toggleBranch,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
