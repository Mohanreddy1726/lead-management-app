import { cn } from "@/lib/utils";
import { scoreBand } from "@/data/mock";
import type { LeadSource, LeadStage, LeadStatus } from "@/data/types";

const base = "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const statusTone: Record<string, string> = {
  New: "border-primary/25 bg-primary/10 text-primary",
  Contacted: "border-info/25 bg-info/10 text-info",
  Interested: "border-success/25 bg-success/10 text-success",
  "Not Interested": "border-border bg-muted text-muted-foreground",
  "Follow-up": "border-warning/30 bg-warning/15 text-warning",
  Unreachable: "border-border bg-muted text-muted-foreground",
  Lost: "border-destructive/25 bg-destructive/10 text-destructive",
  Converted: "border-success/30 bg-success/15 text-success",
  Pending: "border-warning/30 bg-warning/15 text-warning",
  Scheduled: "border-info/25 bg-info/10 text-info",
  Overdue: "border-destructive/25 bg-destructive/10 text-destructive",
  Completed: "border-success/25 bg-success/10 text-success",
  Paid: "border-success/25 bg-success/10 text-success",
  Partial: "border-warning/30 bg-warning/15 text-warning",
  Verified: "border-success/25 bg-success/10 text-success",
  Received: "border-info/25 bg-info/10 text-info",
  Requested: "border-warning/30 bg-warning/15 text-warning",
  "Not Requested": "border-border bg-muted text-muted-foreground",
  "Application Pending": "border-warning/30 bg-warning/15 text-warning",
  "Application Started": "border-info/25 bg-info/10 text-info",
  "Documents Pending": "border-warning/30 bg-warning/15 text-warning",
  "Documents Verified": "border-success/25 bg-success/10 text-success",
  Submitted: "border-info/25 bg-info/10 text-info",
  "University Processing": "border-primary/25 bg-primary/10 text-primary",
  "Offer Received": "border-success/30 bg-success/15 text-success",
  Admission: "border-success/30 bg-success/15 text-success",
  "Admission Confirmed": "border-success/30 bg-success/15 text-success",
  "Fee Payment": "border-primary/25 bg-primary/10 text-primary",
  "Pre-Departure": "border-info/25 bg-info/10 text-info",
  Rejected: "border-destructive/25 bg-destructive/10 text-destructive",
  Active: "border-success/25 bg-success/10 text-success",
  Paused: "border-warning/30 bg-warning/15 text-warning",
  Open: "border-success/25 bg-success/10 text-success",
  Waiting: "border-warning/30 bg-warning/15 text-warning",
  Closed: "border-border bg-muted text-muted-foreground",
  High: "border-destructive/25 bg-destructive/10 text-destructive",
  Medium: "border-warning/30 bg-warning/15 text-warning",
  Low: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return <span className={cn(base, statusTone[value] ?? "border-border bg-muted text-muted-foreground", className)}>{value}</span>;
}

const stageTone: Record<LeadStage, string> = {
  New: "border border-indigo-200 bg-indigo-50 text-indigo-900 font-semibold",
  Assigned: "border border-blue-200 bg-blue-50 text-blue-900 font-semibold",
  Contacted: "border border-purple-200 bg-purple-50 text-purple-900 font-semibold",
  Interested: "border border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold",
  Counselling: "border border-cyan-200 bg-cyan-50 text-cyan-900 font-semibold",
  Application: "border border-amber-200 bg-amber-50 text-amber-900 font-semibold",
  Documentation: "border border-amber-200 bg-amber-50 text-amber-900 font-semibold",
  Admission: "border border-emerald-300 bg-emerald-100 text-emerald-900 font-bold",
  Converted: "border border-emerald-300 bg-emerald-100 text-emerald-900 font-bold",
};

export function StageBadge({ value }: { value: LeadStage }) {
  return <span className={cn(base, stageTone[value] || "border border-slate-200 bg-slate-100 text-slate-800")}>{value}</span>;
}

const sourceTone: Record<LeadSource, { badge: string; dot: string }> = {
  Website: {
    badge:
      "border border-emerald-300 bg-emerald-100/90 text-emerald-900 font-bold shadow-2xs",
    dot: "bg-emerald-600 ring-2 ring-emerald-400/50",
  },
  "Google Ads": {
    badge:
      "border border-blue-300 bg-blue-100/90 text-blue-900 font-bold shadow-2xs",
    dot: "bg-blue-600 ring-2 ring-blue-400/50",
  },
  "Meta Ads": {
    badge:
      "border border-purple-300 bg-purple-100/90 text-purple-900 font-bold shadow-2xs",
    dot: "bg-purple-600 ring-2 ring-purple-400/50",
  },
  WhatsApp: {
    badge:
      "border border-teal-300 bg-teal-100/90 text-teal-900 font-bold shadow-2xs",
    dot: "bg-teal-600 ring-2 ring-teal-400/50",
  },
  Manual: {
    badge:
      "border border-slate-300 bg-slate-100 text-slate-800 font-bold",
    dot: "bg-slate-500",
  },
  "CSV Import": {
    badge:
      "border border-sky-300 bg-sky-100 text-sky-900 font-bold shadow-2xs",
    dot: "bg-sky-600 ring-2 ring-sky-400/50",
  },
};

export function SourceBadge({ value, className }: { value: LeadSource; className?: string }) {
  const tone = sourceTone[value] || {
    badge: "border-border bg-surface-2 text-foreground font-medium",
    dot: "bg-muted-foreground",
  };
  return (
    <span className={cn(base, tone.badge, className)}>
      <span className={cn("size-2 rounded-full", tone.dot)} />
      {value}
    </span>
  );
}

export function ScoreBadge({ score, showBand = true }: { score: number; showBand?: boolean }) {
  const band = scoreBand(score);
  const tone =
    band === "Very High" ? "border-success/40 bg-success/15 text-success"
    : band === "High" ? "border-success/25 bg-success/10 text-success"
    : band === "Medium" ? "border-warning/30 bg-warning/15 text-warning"
    : "border-destructive/25 bg-destructive/10 text-destructive";
  return (
    <span className={cn(base, tone, "text-numeric")}>
      {score}{showBand && <span className="opacity-70">· {band}</span>}
    </span>
  );
}

export function StatusPill({ value }: { value: LeadStatus }) {
  return <StatusBadge value={value} />;
}
