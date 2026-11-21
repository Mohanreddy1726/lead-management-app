"use client";

import React, { useState } from "react";
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { syncLeadsFromDb } from "@/services/api";

interface SyncMetaModalProps {
  open: boolean;
  onClose: () => void;
}

export function SyncMetaModal({ open, onClose }: SyncMetaModalProps) {
  const [token, setToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("307445411390224");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/leads/meta-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim() || undefined,
          adAccountId: adAccountId.trim() || undefined,
          branch: "mbbs",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to fetch leads from Meta Ads.");
        setLoading(false);
        return;
      }

      setResult(data);
      // Trigger store refresh so leads appear in table immediately
      syncLeadsFromDb();
    } catch (err: any) {
      setError(err?.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setResult(null);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} className="sm:max-w-lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
            <DownloadCloud className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Sync Meta Ads Leads (MBBS)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fetch all historical submissions from your Facebook &amp; Instagram MBBS Instant Forms directly into Lead.OS.
            </p>
          </div>
        </div>

        {/* Ad Account Info Box */}
        <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Target Ad Account:</span>
            <span className="font-mono font-semibold text-foreground">
              act_{adAccountId.replace("act_", "")}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-muted-foreground">Branch Allocation:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-400">
              <span className="size-2 rounded-full bg-purple-600" />
              MBBS Abroad
            </span>
          </div>
        </div>

        {/* Success View */}
        {result ? (
          <div className="space-y-3.5 pt-1">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Sync Complete!</span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                {result.message}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/80 text-center font-mono">
                <div className="bg-white/80 dark:bg-card/70 p-2 rounded-lg border border-emerald-200/50">
                  <div className="text-[10px] text-muted-foreground uppercase">Found</div>
                  <div className="text-base font-bold text-foreground">{result.totalFetched ?? 0}</div>
                </div>
                <div className="bg-white/80 dark:bg-card/70 p-2 rounded-lg border border-emerald-200/50">
                  <div className="text-[10px] text-muted-foreground uppercase">Imported</div>
                  <div className="text-base font-bold text-emerald-600">{result.newLeadsInserted ?? 0}</div>
                </div>
                <div className="bg-white/80 dark:bg-card/70 p-2 rounded-lg border border-emerald-200/50">
                  <div className="text-[10px] text-muted-foreground uppercase">Duplicates</div>
                  <div className="text-base font-bold text-amber-600">{result.duplicatesSkipped ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="button"
                onClick={handleClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer text-xs"
              >
                Close &amp; View Leads
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Error Message with Help */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Meta API Notice</span>
                </div>
                <p className="leading-relaxed">{error}</p>
                {error.includes("not a confirmed user") && (
                  <div className="rounded-lg bg-white/80 dark:bg-card/80 p-2.5 text-[11px] text-foreground border border-red-200/60 space-y-1">
                    <div className="font-semibold text-red-800 dark:text-red-300">
                      Why this happens:
                    </div>
                    <p className="text-muted-foreground">
                      The Facebook profile has an unconfirmed email/phone or identity checkpoint on facebook.com, or the token was generated as a personal User Token.
                    </p>
                    <div className="pt-1 font-semibold text-indigo-600">
                      Solution: Generate a System User Token in Meta Business Settings (which never expires and bypasses user checkpoints).
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Optional Token Override */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  Update / Paste Page Access Token (Optional)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Defaults to .env.local
                </span>
              </div>
              <textarea
                rows={2}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Leave blank to use saved token from .env.local, or paste fresh token here"
                className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary font-mono"
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
                type="button"
                size="sm"
                onClick={handleSync}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer text-xs gap-1.5 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Fetching Leads from Meta…
                  </>
                ) : (
                  <>
                    <DownloadCloud className="size-3.5" />
                    Fetch All MBBS Leads Now
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
