"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, Loader2, Shield, Headphones } from "lucide-react";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { deleteTeamMember } from "@/services/api";
import type { TeamMember } from "@/data/types";
import { cn } from "@/lib/utils";

interface DeleteTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onDeleted?: (member: TeamMember) => void;
}

export function DeleteTeamMemberModal({
  open,
  onClose,
  member,
  onDeleted,
}: DeleteTeamMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const isManager = member.role === "Manager";

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await deleteTeamMember(member.id);
      if (!res.success) {
        setError(res.error || "Failed to delete team member.");
        setLoading(false);
        return;
      }
      setLoading(false);
      onDeleted?.(member);
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) {
          setError(null);
          onClose();
        }
      }}
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {/* Warning Icon & Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <Trash2 className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Delete Team Member
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this team member? This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Member Preview Card */}
        <div className="rounded-xl border border-border bg-surface-2 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg font-bold text-xs text-white shrink-0 shadow-2xs",
                isManager
                  ? "bg-gradient-to-br from-violet-600 to-indigo-700"
                  : "bg-gradient-to-br from-emerald-600 to-teal-700"
              )}
            >
              {member.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-foreground truncate">
                {member.name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {member.email}
              </div>
            </div>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0 border",
              isManager
                ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            )}
          >
            {isManager ? <Shield className="size-3" /> : <Headphones className="size-3" />}
            {member.role}
          </span>
        </div>

        {/* Impact Warning Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Lead Assignment Impact</div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
              Any leads currently assigned to <span className="font-semibold">{member.name}</span> will be safely reset to <span className="font-semibold">&quot;Yet to Assign&quot;</span> so they can be reassigned to other team members without data loss.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer text-xs gap-1.5 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                Delete Team Member
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
