"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/badges";
import {
  formatDate,
  getAdmissions,
  getLeadById,
  updateAdmissionStage,
  store,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { Search } from "lucide-react";
import type { Admission } from "@/data/types";

const STAGES: Admission["stage"][] = [
  "Offer Received",
  "Admission Confirmed",
  "Fee Payment",
  "Pre-Departure",
  "Completed",
];

export default function AdmissionsPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const list = getAdmissions(branch);

  const filtered = list.filter((a) => {
    const student = getLeadById(a.leadId);
    const q = query.trim().toLowerCase();
    if (
      q &&
      ![a.id, a.university, a.course, a.country, student?.name || ""]
        .some((f) => f.toLowerCase().includes(q))
    ) {
      return false;
    }
    if (stageFilter && a.stage !== stageFilter) return false;
    return true;
  });

  const handleStageChange = (id: string, stage: Admission["stage"], studentName?: string) => {
    updateAdmissionStage(id, stage);
    toast.success(`Admission stage updated to ${stage}${studentName ? ` for ${studentName}` : ""}`);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Admissions`}
        subtitle={`Students who made it into ${branch === "masters" ? "Masters" : "MBBS"} universities — visa progress, fee clearance, and pre-departure briefings.`}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Total Admissions" value={list.length} tone="text-success" />
        <StatTile
          label="Fees Paid in Full"
          value={list.filter((a) => a.feeStatus === "Paid").length}
        />
        <StatTile
          label="Fees Partial"
          value={list.filter((a) => a.feeStatus === "Partial").length}
          tone="text-warning"
        />
        <StatTile
          label="Pre-Departure Briefing"
          value={list.filter((a) => a.stage === "Pre-Departure").length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, university, country, admission ID…"
            className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          <option value="">All admission stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Panel title={`All admissions (${filtered.length})`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Admission ID</th>
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">University</th>
                <th className="px-4 py-3 text-left font-medium">Country</th>
                <th className="px-4 py-3 text-left font-medium">Admission Date</th>
                <th className="px-4 py-3 text-left font-medium">Counsellor</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-right font-medium">Update Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => {
                const lead = getLeadById(a.leadId);
                return (
                  <tr key={a.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                      {a.id}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/leads/${a.leadId}`}
                        className="text-foreground hover:text-primary hover:underline transition font-semibold"
                      >
                        {lead?.name || "Student"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{a.university}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.country}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(a.admissionDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.counsellor}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={a.stage} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        aria-label={`Update stage for ${lead?.name || "Student"}`}
                        className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs font-medium outline-none focus:border-primary"
                        value={a.stage}
                        onChange={(e) =>
                          handleStageChange(
                            a.id,
                            e.target.value as Admission["stage"],
                            lead?.name
                          )
                        }
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
