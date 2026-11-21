"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Shield,
  Headphones,
  Phone,
  Mail,
  Building,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Target,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Sparkles,
  PhoneCall,
  Activity,
  BarChart3,
  ExternalLink,
  Trash2,
  KeyRound,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader, Panel, EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import {
  getTeamMemberById,
  getTeamMembers,
  getCalls,
  getLeads,
  getFollowUps,
  formatINR,
  formatDate,
  formatDateTime,
} from "@/services/api";
import { ScoreBadge, StageBadge, StatusBadge } from "@/components/shared/badges";
import { DeleteTeamMemberModal } from "@/components/modals/delete-team-member-modal";
import { ResetPasswordModal } from "@/components/modals/reset-password-modal";
import { cn } from "@/lib/utils";

const outcomeColors: Record<string, string> = {
  Interested: "#10b981", // emerald
  "Call Back": "#6366f1", // indigo
  "Parent Discussion Required": "#f59e0b", // amber
  Connected: "#06b6d4", // cyan
  "No Answer": "#94a3b8", // slate
  Busy: "#f97316", // orange
  "Wrong Number": "#ef4444", // red
  "Not Interested": "#dc2626", // red-600
};

export default function MemberAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading team member analytics…
          </div>
        </div>
      }
    >
      <MemberAnalyticsContent params={params} />
    </React.Suspense>
  );
}

function MemberAnalyticsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = React.use(params);
  const { currentRole } = useRole();

  const member = getTeamMemberById(id);
  const allMembers = getTeamMembers();
  const allCalls = getCalls();
  const allLeads = getLeads();
  const allFollowUps = getFollowUps();

  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  // If member not found
  if (!member) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          title="Team Member Not Found"
          description={`No team member with ID "${id}" was found in the directory.`}
          action={
            <Button
              onClick={() => router.push("/team")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <ArrowLeft className="size-4" /> Return to Team
            </Button>
          }
        />
      </div>
    );
  }

  // Permission check: Managers can only view telecallers
  if (currentRole === "manager" && member.role === "Manager") {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          title="Access Restricted"
          description="Branch managers can only view analytics and performance for telecaller team members."
          action={
            <Button
              onClick={() => router.push("/team")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <ArrowLeft className="size-4" /> Return to Team Directory
            </Button>
          }
        />
      </div>
    );
  }

  const isManager = member.role === "Manager";

  // Filter telecallers in this manager's team (if manager)
  const managedTeam = isManager
    ? allMembers.filter((m) => m.team === member.team && m.role === "Telecaller")
    : [];

  // Member's calls (fallback to sample calls if newly created)
  const memberCalls = useMemo(() => {
    const direct = allCalls.filter(
      (c) => c.telecallerId === member.id || (!isManager && c.telecallerId === "tc-1")
    );
    return direct.length > 0 ? direct.slice(0, 15) : allCalls.slice(0, 8);
  }, [allCalls, member.id, isManager]);

  // Member's assigned leads
  const memberLeads = useMemo(() => {
    const direct = allLeads.filter(
      (l) => l.assignedTo === member.id || (!isManager && l.assignedTo === "tc-1")
    );
    return direct.length > 0 ? direct.slice(0, 12) : allLeads.slice(0, 8);
  }, [allLeads, member.id, isManager]);

  // Member's follow-ups
  const memberFollowUps = useMemo(() => {
    return allFollowUps.slice(0, 6);
  }, [allFollowUps]);

  // Performance Trend Chart Data (Last 14 days)
  const activityData = useMemo(() => {
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 14 : 30;
    const now = new Date("2026-10-17T10:00:00Z").getTime();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now - (days - 1 - i) * 86400000);
      const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const baseCalls = isManager ? 25 : 14;
      const variation = ((i * 7 + 13) % 9) - 4;
      return {
        date: dayLabel,
        callsConnected: Math.max(4, baseCalls + variation),
        followUps: Math.max(2, Math.round((baseCalls + variation) * 0.6)),
        qualified: Math.max(1, Math.round((baseCalls + variation) * 0.35)),
      };
    });
  }, [timeframe, isManager]);

  // Funnel Data
  const funnelData = useMemo(() => {
    const assigned = member.assigned || (isManager ? 280 : 120);
    const contacted = Math.round(assigned * 0.82);
    const interested = Math.round(assigned * 0.44);
    const applications = Math.round(assigned * 0.18);
    const admissions = member.admissions || Math.round(assigned * 0.06);

    return [
      { stage: "Assigned", count: assigned, fill: "#6366f1" },
      { stage: "Contacted", count: contacted, fill: "#3b82f6" },
      { stage: "Interested", count: interested, fill: "#06b6d4" },
      { stage: "Applications", count: applications, fill: "#8b5cf6" },
      { stage: "Admissions", count: admissions, fill: "#10b981" },
    ];
  }, [member.assigned, member.admissions, isManager]);

  // Outcome Breakdown Data
  const outcomeData = useMemo(() => {
    return [
      { name: "Interested", value: 34, color: outcomeColors.Interested },
      { name: "Parent Discussion", value: 24, color: outcomeColors["Parent Discussion Required"] },
      { name: "Call Back", value: 18, color: outcomeColors["Call Back"] },
      { name: "Connected", value: 12, color: outcomeColors.Connected },
      { name: "No Answer", value: 10, color: outcomeColors["No Answer"] },
      { name: "Not Interested", value: 6, color: outcomeColors["Not Interested"] },
    ];
  }, []);

  const totalAssigned = member.assigned || (isManager ? 280 : 120);
  const totalAdm = member.admissions || 4;
  const conversionRate = totalAssigned > 0 ? ((totalAdm / totalAssigned) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/team"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back to Team Directory
        </Link>

        <div className="flex items-center gap-2.5">
          {currentRole === "admin" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetPasswordOpen(true)}
                className="text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/60 text-xs gap-1.5 h-8 cursor-pointer"
              >
                <KeyRound className="size-3.5" />
                Reset Password
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 text-xs gap-1.5 h-8 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                Delete Member
              </Button>
            </>
          )}

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe("7d")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition cursor-pointer",
                timeframe === "7d"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("30d")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition cursor-pointer",
                timeframe === "30d"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("90d")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition cursor-pointer",
                timeframe === "90d"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Quarter
            </button>
          </div>
        </div>
      </div>

      {/* Member Profile Hero Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Member Identity & Details */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-2xl font-bold text-xl text-white shadow-sm shrink-0",
                isManager
                  ? "bg-gradient-to-br from-violet-600 to-indigo-700"
                  : "bg-gradient-to-br from-emerald-600 to-teal-700"
              )}
            >
              {member.avatarInitials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {member.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                    isManager
                      ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                  )}
                >
                  {isManager ? <Shield className="size-3.5" /> : <Headphones className="size-3.5" />}
                  {member.role}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {member.presence}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1">
                  <Building className="size-3.5 text-muted-foreground" />
                  {member.team}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <a href={`mailto:${member.email}`} className="hover:underline">
                    {member.email}
                  </a>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <a href={`tel:${member.phone}`} className="hover:underline">
                    {member.phone}
                  </a>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Joined {formatDate(member.joinDate || "2024-11-01")}
                </span>
              </div>

              <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                <Activity className="size-3.5 text-primary" />
                <span>Current activity:</span>
                <span className="font-medium text-foreground">
                  {member.currentActivity}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isManager ? "Team Volume" : "Assigned Leads"}
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {totalAssigned}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Calls Placed
              </div>
              <div className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {member.callsToday * 12}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Conversion %
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {conversionRate}%
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-center">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Revenue
              </div>
              <div className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatINR(member.revenue || 1200000)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Progress Quota Bars */}
      <Panel
        title="Monthly Target Quotas & Performance"
        description="Quota achievement progress for active cycle"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {member.targets.map((tgt, i) => {
            const pct = tgt.target > 0 ? Math.min(100, Math.round((tgt.done / tgt.target) * 100)) : 0;
            return (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface-2 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{tgt.label}</span>
                  <span className="font-bold text-numeric text-indigo-600 dark:text-indigo-400">
                    {pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-card">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      pct >= 75
                        ? "bg-emerald-500"
                        : pct >= 40
                        ? "bg-indigo-500"
                        : "bg-amber-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Completed: {tgt.done}</span>
                  <span>Target: {tgt.target}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Analytics Visualizations: Activity Trend & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity & Call Volume Trend */}
        <Panel
          className="lg:col-span-2"
          title="Daily Call & Outreach Volume"
          description={`Logged calls, follow-ups and qualified interactions over the past ${timeframe === "7d" ? "7" : timeframe === "30d" ? "14" : "30"} days`}
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="callsConnected"
                  name="Calls Connected"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#callsGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="followUps"
                  name="Follow-ups Logged"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#fuGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Lead Funnel Breakdown */}
        <Panel
          title="Lead Conversion Funnel"
          description="Pipeline drop-off from assigned to admission"
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={funnelData}
                margin={{ top: 10, right: 20, left: 15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} stroke="var(--muted-foreground)" />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} tickLine={false} stroke="var(--muted-foreground)" width={75} />
                <Tooltip
                  formatter={(val: any) => [`${val} leads`, "Volume"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Row 2: Call Outcomes Donut & Branch Performance (if Manager) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Outcomes Donut */}
        <Panel
          title="Call Outcome Breakdown"
          description="Distribution of call outcomes logged by member"
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`outcome-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Share"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
            {outcomeData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="font-semibold text-foreground ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Manager-only section: Team Telecallers Performance */}
        {isManager ? (
          <Panel
            className="lg:col-span-2"
            title={`Managed Team Members (${member.team})`}
            description={`Telecallers directly supervised by ${member.name}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 font-semibold">Telecaller</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Assigned</th>
                    <th className="pb-2 font-semibold text-right">Calls Today</th>
                    <th className="pb-2 font-semibold text-right">Admissions</th>
                    <th className="pb-2 font-semibold text-right">Quota %</th>
                    <th className="pb-2 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {managedTeam.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">
                        No telecallers currently assigned to this branch.
                      </td>
                    </tr>
                  ) : (
                    managedTeam.map((tc) => {
                      const q = tc.targets?.[0];
                      const qPct = q && q.target > 0 ? Math.round((q.done / q.target) * 100) : 0;
                      return (
                        <tr key={tc.id} className="hover:bg-surface-2 transition">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="size-6 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {tc.avatarInitials}
                              </div>
                              <span className="font-medium text-foreground">{tc.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                              <span className="size-1 rounded-full bg-emerald-500" />
                              {tc.presence}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-medium">{tc.assigned}</td>
                          <td className="py-2.5 text-right font-bold text-indigo-600">{tc.callsToday}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">{tc.admissions}</td>
                          <td className="py-2.5 text-right">
                            <span className="font-semibold text-foreground">{qPct}%</span>
                          </td>
                          <td className="py-2.5 text-center">
                            <Link
                              href={`/team/${tc.id}`}
                              className="text-indigo-600 hover:underline font-semibold text-[11px]"
                            >
                              Analytics →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          /* Telecaller Follow-ups Queue */
          <Panel
            className="lg:col-span-2"
            title="Scheduled Follow-up Reminders"
            description="Upcoming and overdue follow-up tasks"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 font-semibold">Lead ID</th>
                    <th className="pb-2 font-semibold">Reason</th>
                    <th className="pb-2 font-semibold">Priority</th>
                    <th className="pb-2 font-semibold">Scheduled Date</th>
                    <th className="pb-2 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {memberFollowUps.map((fu) => (
                    <tr key={fu.id} className="hover:bg-surface-2 transition">
                      <td className="py-2.5 font-medium text-primary">
                        <Link href={`/leads?search=${fu.leadId}`} className="hover:underline">
                          {fu.leadId}
                        </Link>
                      </td>
                      <td className="py-2.5 text-foreground">{fu.reason}</td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            fu.priority === "High"
                              ? "bg-destructive/10 text-destructive"
                              : fu.priority === "Medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-surface-2 text-muted-foreground"
                          )}
                        >
                          {fu.priority}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatDateTime(fu.date)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            fu.status === "Overdue"
                              ? "bg-destructive/10 text-destructive font-bold"
                              : fu.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {fu.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* Recent Call Logs Table */}
      <Panel
        title="Recent Call Logs & Lead Interactions"
        description="Latest recorded calls with student conversations and counsel notes"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 font-semibold">Date & Time</th>
                <th className="pb-2 font-semibold">Lead ID</th>
                <th className="pb-2 font-semibold">Outcome</th>
                <th className="pb-2 font-semibold">Duration</th>
                <th className="pb-2 font-semibold">Notes & Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {memberCalls.map((call) => (
                <tr key={call.id} className="hover:bg-surface-2 transition">
                  <td className="py-3 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(call.date)}
                  </td>
                  <td className="py-3 font-semibold text-primary">
                    <Link href={`/leads?search=${call.leadId}`} className="hover:underline flex items-center gap-1">
                      {call.leadId}
                      <ExternalLink className="size-3 opacity-60" />
                    </Link>
                  </td>
                  <td className="py-3">
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${outcomeColors[call.outcome] || "#6366f1"}15`,
                        color: outcomeColors[call.outcome] || "#6366f1",
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: outcomeColors[call.outcome] || "#6366f1" }}
                      />
                      {call.outcome}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-muted-foreground">{call.duration}</td>
                  <td className="py-3 text-foreground max-w-md">
                    <p className="line-clamp-1">{call.notes}</p>
                    {call.nextAction && (
                      <span className="text-[11px] text-muted-foreground">
                        Next: <strong className="text-foreground">{call.nextAction}</strong>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Active Assigned Leads */}
      <Panel
        title="Active Student Leads Assigned"
        description="Leads currently under active counselling and follow-up"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 font-semibold">Student Name</th>
                <th className="pb-2 font-semibold">Course & Country</th>
                <th className="pb-2 font-semibold">Lead Score</th>
                <th className="pb-2 font-semibold">Stage</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">City</th>
                <th className="pb-2 font-semibold text-right">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {memberLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-2 transition">
                  <td className="py-3">
                    <div>
                      <Link href={`/leads?search=${lead.id}`} className="font-semibold text-foreground hover:underline">
                        {lead.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">{lead.phone}</div>
                    </div>
                  </td>
                  <td className="py-3 text-foreground">
                    <div>{lead.course}</div>
                    <div className="text-[11px] text-muted-foreground">{lead.country}</div>
                  </td>
                  <td className="py-3">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="py-3">
                    <StageBadge value={lead.stage} />
                  </td>
                  <td className="py-3">
                    <StatusBadge value={lead.status} />
                  </td>
                  <td className="py-3 text-muted-foreground">{lead.city}</td>
                  <td className="py-3 text-right text-muted-foreground">
                    {lead.nextFollowUp ? formatDateTime(lead.nextFollowUp) : "Not scheduled"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Delete Team Member Modal (Admin) */}
      <DeleteTeamMemberModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        member={member}
        onDeleted={() => {
          router.push("/team");
        }}
      />

      {/* Reset Team Member Password Modal (Admin) */}
      <ResetPasswordModal
        open={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        member={member}
      />
    </div>
  );
}
