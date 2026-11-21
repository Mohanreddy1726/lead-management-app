"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { LogCallModal } from "@/components/modals/log-call-modal";
import { StatusBadge } from "@/components/shared/badges";
import {
  formatDateTime,
  getCallScripts,
  getCalls,
  getLeadById,
  getTelecallerById,
  store,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { cn } from "@/lib/utils";

export default function CallsPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const calls = getCalls(branch);
  const scripts = getCallScripts(branch);
  const [scriptId, setScriptId] = useState(scripts[0]?.id || "");
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("");

  useEffect(() => {
    if (scripts.length > 0 && !scripts.some((s) => s.id === scriptId)) {
      setScriptId(scripts[0]?.id || "");
    }
  }, [branch, scripts, scriptId]);

  const script = scripts.find((s) => s.id === scriptId) || scripts[0];
  const filtered = outcome ? calls.filter((c) => c.outcome === outcome) : calls;
  const connected = calls.filter((c) => c.outcome === "Connected" || c.outcome === "Interested").length;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Calls`}
        subtitle={`Every call logged against a ${branch === "masters" ? "Masters" : "MBBS"} lead, plus the calling scripts your team follows.`}
        actions={<PrimaryButton tone="brand" onClick={() => setOpen(true)}>Log Call</PrimaryButton>}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Calls logged" value={calls.length} />
        <StatTile label="Connected" value={connected} tone="text-success" />
        <StatTile label="No answer" value={calls.filter((c) => c.outcome === "No Answer").length} tone="text-warning" />
        <StatTile label="Not interested" value={calls.filter((c) => c.outcome === "Not Interested").length} tone="text-destructive" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Call log"
          className="xl:col-span-2"
          bodyClassName="p-0"
          actions={
            <select
              aria-label="Filter by outcome"
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs outline-none focus:border-primary"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="">All outcomes</option>
              {[...new Set(calls.map((c) => c.outcome))].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          }
        >
          <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
            {filtered.map((c) => {
              const lead = getLeadById(c.leadId);
              const owner = getTelecallerById(c.telecallerId);
              return (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 hover:bg-accent/40 transition-colors">
                  <div className="min-w-0">
                    <Link
                      href={`/leads/${c.leadId}`}
                      className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                    >
                      {lead?.name || "Student Lead"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{c.notes}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {owner?.name || "Telecaller"} · {formatDateTime(c.date)} · {c.duration}
                    </p>
                  </div>
                  <StatusBadge value={c.outcome === "Connected" ? "Contacted" : c.outcome === "Interested" ? "Interested" : c.outcome} />
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Call scripts" description="Open the right script while on a call">
          <div className="flex flex-wrap gap-1.5">
            {scripts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScriptId(s.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors",
                  s.id === scriptId ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-accent text-muted-foreground",
                )}
              >
                {s.category}
              </button>
            ))}
          </div>
          {script && (
            <>
              <h3 className="mt-4 text-sm font-semibold">{script.title}</h3>
              <ol className="mt-2 space-y-2">
                {script.steps.map((step, i) => (
                  <li key={step} className="flex gap-2.5 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>
      </div>

      <LogCallModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
