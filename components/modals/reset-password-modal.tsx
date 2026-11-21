"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Shield,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { resetTeamMemberPassword } from "@/services/api";
import type { TeamMember } from "@/data/types";
import { cn } from "@/lib/utils";

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSuccess?: () => void;
}

export function ResetPasswordModal({
  open,
  onClose,
  member,
  onSuccess,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!member) return null;

  const isManager = member.role === "Manager";

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let gen = "Pass@";
    for (let i = 0; i < 4; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    gen += Math.floor(10 + Math.random() * 90);
    setPassword(gen);
    setConfirmPassword(gen);
    setShowPassword(true);
    setError(null);
  };

  const handleCopyCredentials = () => {
    const text = `Lead.OS Login Credentials\nEmail: ${member.email}\nNew Password: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetTeamMemberPassword(member.id, password);
      if (!res.success) {
        setError(res.error || "Failed to update password.");
        setLoading(false);
        return;
      }

      setSuccessMessage(
        `Password for ${member.name} has been successfully updated!`
      );
      setLoading(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccessMessage(null);
      setShowPassword(false);
      setCopied(false);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} className="sm:max-w-md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <KeyRound className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Reset Member Password
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set a new login password for this team member so they can access their account.
            </p>
          </div>
        </div>

        {/* Member Profile Card */}
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

        {/* Success State */}
        {successMessage ? (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMessage}</span>
              </div>
              <div className="text-xs bg-white/70 dark:bg-card/70 border border-emerald-200/60 dark:border-emerald-800 rounded-lg p-2.5 space-y-1 font-mono text-[11px]">
                <div>Email: <span className="font-semibold text-foreground">{member.email}</span></div>
                <div>New Password: <span className="font-semibold text-foreground">{password}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCredentials}
                className="cursor-pointer text-xs gap-1.5"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copied to Clipboard!" : "Copy Login Info"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            {/* New Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  New Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                >
                  <Sparkles className="size-3" />
                  Generate Strong
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer text-xs gap-1.5 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <KeyRound className="size-3.5" />
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
