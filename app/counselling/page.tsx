"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/badges";
import {
  formatDate,
  getCounselling,
  getLeadById,
  updateCounsellingStatus,
  store,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { GraduationCap, User, ArrowRight } from "lucide-react";
import type { CounsellingRecord } from "@/data/types";

const COLUMNS = ["Pending", "Scheduled", "Completed", "Follow-up Required"] as const;

export default function CounsellingPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const records = getCounselling(branch);

  const handleStatusChange = (id: string, status: CounsellingRecord["status"], studentName?: string) => {
    updateCounsellingStatus(id, status);
    toast.success(`Counselling moved to "${status}"${studentName ? ` for ${studentName}` : ""}`);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Counselling`}
        subtitle={`From first session to a finalised ${branch === "masters" ? "Masters" : "MBBS"} university shortlist.`}
      />
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = records.filter((r) => r.status === col);
          return (
            <Panel
              key={col}
              title={col}
              description={`${items.length} students`}
              bodyClassName="space-y-3 p-3"
            >
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No records in {col}.
                </p>
              )}
              {items.map((r) => {
                const lead = getLeadById(r.leadId);
                return (
                  <article
                    key={r.id}
                    className="rounded-lg border border-border bg-surface-2 p-3 transition hover:border-primary/40 hover:shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/leads/${r.leadId}`}
                        className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition block"
                      >
                        {lead?.name || "Student"}
                      </Link>
                      <span className="font-mono text-[10px] text-muted-foreground">{r.leadId}</span>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {r.course} · {r.country}
                    </p>

                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5 pt-0.5">
                      <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{r.university}</span>
                    </p>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <User className="size-3 text-muted-foreground shrink-0" />
                      <span>{r.counsellor}</span>
                      <span>·</span>
                      <span>{formatDate(r.date)}</span>
                    </p>

                    {r.outcome && (
                      <p className="text-xs text-muted-foreground bg-card/60 rounded px-2 py-1 border border-border/50">
                        {r.outcome}
                      </p>
                    )}

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Stage:
                      </label>
                      <select
                        aria-label={`Change stage for ${lead?.name || "student"}`}
                        className="h-7 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground outline-none focus:border-primary"
                        value={r.status}
                        onChange={(e) =>
                          handleStatusChange(
                            r.id,
                            e.target.value as CounsellingRecord["status"],
                            lead?.name
                          )
                        }
                      >
                        {COLUMNS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                );
              })}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
