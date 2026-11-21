"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/badges";
import {
  getApplications,
  getLeadById,
  updateApplicationStage,
  store,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { Search } from "lucide-react";
import type { Application } from "@/data/types";

const STAGES: Application["stage"][] = [
  "Application Pending",
  "Application Started",
  "Documents Pending",
  "Documents Verified",
  "Submitted",
  "University Processing",
  "Offer Received",
  "Admission",
];

export default function ApplicationsPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const apps = getApplications(branch);

  const filtered = apps.filter((a) => {
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

  const handleStageChange = (id: string, stage: Application["stage"], studentName?: string) => {
    updateApplicationStage(id, stage);
    toast.success(`Application updated to ${stage}${studentName ? ` for ${studentName}` : ""}`);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Applications`}
        subtitle={`Every ${branch === "masters" ? "Masters" : "MBBS"} university application connected to its student lead. Track admissions offer progression.`}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Total Applications" value={apps.length} />
        <StatTile
          label="Submitted"
          value={apps.filter((a) => a.stage === "Submitted").length}
        />
        <StatTile
          label="Offer Letters Received"
          value={apps.filter((a) => a.stage === "Offer Received").length}
          tone="text-success"
        />
        <StatTile
          label="Documents Pending"
          value={apps.filter((a) => a.stage === "Documents Pending").length}
          tone="text-warning"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, university, country, app ID…"
            className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          <option value="">All application stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Panel title={`All applications (${filtered.length})`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Application ID</th>
                <th className="px-4 py-3 text-left font-medium">Student Lead</th>
                <th className="px-4 py-3 text-left font-medium">University</th>
                <th className="px-4 py-3 text-left font-medium">Country</th>
                <th className="px-4 py-3 text-left font-medium">Course</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-right font-medium">Update Progression</th>
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
                    <td className="px-4 py-3 text-muted-foreground">{a.course}</td>
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
                            e.target.value as Application["stage"],
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
