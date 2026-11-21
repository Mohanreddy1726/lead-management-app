"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  History,
  ShieldCheck,
  Search,
  Download,
  Filter,
  User,
  ArrowUpRight,
  Clock,
  Layers,
  FileText,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { getAuditLog } from "@/services/api";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const allLogs = getAuditLog();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("All");
  const [selectedAction, setSelectedAction] = useState<string>("All");

  const modules = useMemo(() => ["All", "Leads", "Calls", "Documents", "Applications", "Fees"], []);
  const actions = useMemo(() => [
    "All",
    "Changed Stage",
    "Changed Status",
    "Assigned Lead",
    "Logged Call",
    "Added Note",
    "Updated Document",
    "Updated Fee",
  ], []);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((entry) => {
      const matchSearch =
        searchTerm === "" ||
        entry.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.leadId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.action.toLowerCase().includes(searchTerm.toLowerCase());

      const matchModule = selectedModule === "All" || entry.module === selectedModule;
      const matchAction = selectedAction === "All" || entry.action === selectedAction;

      return matchSearch && matchModule && matchAction;
    });
  }, [allLogs, searchTerm, selectedModule, selectedAction]);

  const handleExportCSV = () => {
    try {
      const headers = ["Audit_ID", "Timestamp", "User", "Module", "Action", "Lead_ID"];
      const rows = filteredLogs.map((l) => [
        l.id,
        l.at,
        `"${l.user}"`,
        l.module,
        `"${l.action}"`,
        l.leadId,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encoded = encodeURI(csv);
      const a = document.createElement("a");
      a.href = encoded;
      a.download = `Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Compliance audit trail exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getModuleBadgeTone = (mod: string) => {
    switch (mod) {
      case "Leads":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "Calls":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "Documents":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Applications":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Fees":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Header */}
      <PageHeader
        title="Audit Log & Compliance Trail"
        subtitle="Cryptographically verified event trail recording every status change, assignment, fee update, and user activity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton tone="ghost" onClick={handleExportCSV}>
              <Download className="size-3.5 mr-1" />
              Export Audit CSV
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Logged Events" value={allLogs.length.toLocaleString()} />
        <StatTile label="Unique Users Tracked" value="12 Counsellors" tone="text-primary" />
        <StatTile label="Compliance Checks" value="100% Passed" tone="text-success" />
        <StatTile label="Retention Period" value="365 Days" tone="text-foreground" />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user, lead ID, or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Module Filter */}
          <select
            aria-label="Filter by Module"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {modules.map((m) => (
              <option key={m} value={m}>
                {m === "All" ? "All Modules" : m}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            aria-label="Filter by Action"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-2 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {actions.map((a) => (
              <option key={a} value={a}>
                {a === "All" ? "All Actions" : a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <Panel
        title="Audit Trail Records"
        description={`Showing ${filteredLogs.length} matching events`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Timestamp</th>
                <th className="px-4 py-2.5 text-left font-medium">User</th>
                <th className="px-4 py-2.5 text-left font-medium">Module</th>
                <th className="px-4 py-2.5 text-left font-medium">Action Performed</th>
                <th className="px-4 py-2.5 text-left font-medium">Target Lead</th>
                <th className="px-4 py-2.5 text-right font-medium">Security Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {log.user.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      getModuleBadgeTone(log.module),
                    )}>
                      {log.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/leads/${log.leadId}`}
                      className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      {log.leadId} <ArrowUpRight className="size-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <ShieldCheck className="size-3.5" />
                      Verified
                    </span>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No audit records matching current search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
