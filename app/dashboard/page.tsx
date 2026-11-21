"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CalendarClock,
  ArrowUpRight,
  Activity,
  FileText,
  GraduationCap,
  Heart,
  Sparkles,
  UserCheck,
  UserX,
  Users,
  PhoneCall,
  Phone,
  Target,
  Headphones,
  GitBranch,
  Megaphone,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Search,
  Check,
} from "lucide-react";
import { KpiCard, PageHeader, Panel } from "@/components/shared/page";
import { LeadTrend, SourceDonut, PipelineChart, TeamChart } from "@/components/charts/dashboard-charts";
import { activityFeed, funnelStages, kpis, telecallers as mockTelecallers } from "@/data/mock";
import {
  getSources,
  getFollowUps,
  getLeads,
  getTelecallers,
  getCampaigns,
  getCalls,
  getApplications,
  getAdmissions,
  logCall,
  formatINR,
  store,
  syncLeadsFromDb,
  syncTeamFromDb,
} from "@/services/api";
import type { Telecaller } from "@/data/types";

import { ScoreBadge, StageBadge, StatusBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TelecallerMobileDashboard } from "@/components/telecaller/telecaller-mobile-dashboard";
import { useRole } from "@/context/RoleContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const icons: Record<string, typeof Users> = {
  users: Users,
  sparkles: Sparkles,
  userx: UserX,
  usercheck: UserCheck,
  calendar: CalendarClock,
  heart: Heart,
  filetext: FileText,
  graduation: GraduationCap,
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentRole } = useRole();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user && (session.user as any).roleSelected === false) {
      router.push("/choose-role");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="size-2 rounded-full bg-indigo-500 animate-ping" />
          <span>Loading workspace…</span>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard based on active role
  if (currentRole === "telecaller") {
    return <TelecallerDashboard />;
  }

  if (currentRole === "manager") {
    return <ManagerDashboard />;
  }

  return <AdminDashboard />;
}

// ─────────────────────────────────────────────────────────────
// 1. TELECALLER DASHBOARD (NATIVE MOBILE & PWA EXPERIENCE)
// ─────────────────────────────────────────────────────────────
function TelecallerDashboard() {
  return <TelecallerMobileDashboard />;
}

// ─────────────────────────────────────────────────────────────
// 2. MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────
function ManagerDashboard() {
  const router = useRouter();
  const { branch } = useBranch();
  useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);
  const leads = getLeads(branch);

  const telecallers = getTelecallers(branch);
  const campaigns = getCampaigns(branch);
  const overdue = getFollowUps(branch).filter((f) => f.status === "Overdue");

  const totalCallsToday = telecallers.reduce((sum, t) => sum + t.callsToday, 0);
  const totalAssigned = telecallers.reduce((sum, t) => sum + t.assigned, 0);
  const totalAdmissions = telecallers.reduce((sum, t) => sum + t.admissions, 0);
  const unassignedLeads = leads.filter((l) => !l.assignedTo).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Manager & Team Dashboard"
        subtitle="Supervise telecallers, lead allocation queues, and admissions funnel velocity."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/assignment">
                <GitBranch className="size-4" /> Lead Assignment
              </Link>
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5" asChild>
              <Link href="/campaigns">
                <Megaphone className="size-4" /> Campaigns ROI
              </Link>
            </Button>
          </div>
        }
      />

      {/* Manager KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Team Pipeline Leads"
          value={totalAssigned}
          trend={12}
          icon={<Users className="size-4" />}
          onClick={() => router.push("/leads")}
        />
        <KpiCard
          label="Team Calls Today"
          value={totalCallsToday}
          trend={18}
          icon={<PhoneCall className="size-4" />}
          onClick={() => router.push("/calls")}
        />
        <KpiCard
          label="Unassigned Leads Queue"
          value={unassignedLeads}
          trend={-15}
          icon={<AlertCircle className="size-4" />}
          onClick={() => router.push("/assignment")}
        />
        <KpiCard
          label="Team Admissions"
          value={totalAdmissions}
          trend={22}
          icon={<GraduationCap className="size-4" />}
          onClick={() => router.push("/leads?stage=Admission")}
        />
      </div>

      {/* Telecaller Team Live Performance & Presence */}
      <Panel
        title="Telecaller Team Roster & Daily Performance"
        description="Real-time activity and target metrics across all telecallers"
        actions={
          <Link href="/team" className="text-xs font-semibold text-indigo-600 hover:underline">
            Manage team targets →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Telecaller</th>
                <th className="px-3 py-2.5 text-left font-medium">Team</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-left font-medium">Current Activity</th>
                <th className="px-3 py-2.5 text-center font-medium">Assigned</th>
                <th className="px-3 py-2.5 text-center font-medium">Calls Today</th>
                <th className="px-3 py-2.5 text-center font-medium">Interested</th>
                <th className="px-3 py-2.5 text-center font-medium">Admissions</th>
                <th className="px-3 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {telecallers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {t.avatarInitials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-[11px] text-slate-400">{t.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">{t.team}</td>
                  <td className="px-3 py-3">
                    <StatusBadge value={t.presence} />
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 max-w-xs truncate font-mono">
                    {t.currentActivity}
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-semibold text-slate-800">
                    {t.assigned}
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-semibold text-indigo-600">
                    {t.callsToday}
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-600">
                    {t.interested}
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-bold text-slate-900">
                    {t.admissions}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-indigo-600 hover:text-indigo-700"
                      onClick={() => {
                        toast.success(`Opening assignment for ${t.name}`);
                        router.push("/assignment");
                      }}
                    >
                      Assign Leads
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Middle Grid: Funnel & Campaign Performance */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Panel
          title="Admissions Funnel Conversion"
          description="Stage drop-off from new lead to final university admission"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analytics">
                View detailed funnel <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-numeric text-3xl font-semibold">
              {(
                ((funnelStages.find((stage) => stage.stage === "Admission")?.value ?? 0) /
                  Math.max(funnelStages[0]?.value ?? 0, 1)) *
                100
              ).toFixed(1)}
              %
            </span>
            <span className="text-xs text-slate-500">overall team conversion</span>
          </div>
          <PipelineChart
            stages={funnelStages}
            onSelect={(stage) => router.push(`/leads?stage=${encodeURIComponent(stage)}`)}
          />
        </Panel>

        {/* Marketing Campaigns Performance */}
        <Panel
          title="Marketing Campaigns & Lead ROI"
          description="Campaign efficiency, student leads & revenue generated"
          actions={
            <Link href="/campaigns" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all campaigns →
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-2.5 py-2 text-left">Campaign</th>
                  <th className="px-2.5 py-2 text-center">Leads</th>
                  <th className="px-2.5 py-2 text-center">Admissions</th>
                  <th className="px-2.5 py-2 text-right">Spend</th>
                  <th className="px-2.5 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.slice(0, 5).map((cmp) => (
                  <tr key={cmp.id} className="hover:bg-slate-50/50">
                    <td className="px-2.5 py-2.5 font-medium text-slate-800">
                      <div>{cmp.name}</div>
                      <div className="text-[10px] text-slate-400">{cmp.source}</div>
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-semibold text-slate-800">{cmp.leads}</td>
                    <td className="px-2.5 py-2.5 text-center font-bold text-emerald-600">{cmp.admissions}</td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-600">{formatINR(cmp.spend)}</td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-900">{formatINR(cmp.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Urgent Bottlenecks for Manager */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Manager Attention & Bottlenecks" bodyClassName="p-0">
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-800">Unassigned Lead Queue</p>
                <p className="text-xs text-slate-400">14 leads awaiting assignment to telecallers</p>
              </div>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs" asChild>
                <Link href="/assignment">Auto Assign</Link>
              </Button>
            </li>
            <li className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-800">Overdue Follow-ups</p>
                <p className="text-xs text-slate-400">{overdue.length} critical student follow-ups past deadline</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs text-rose-600 border-rose-200" asChild>
                <Link href="/follow-ups">Review Queue</Link>
              </Button>
            </li>
            <li className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-800">Kiran Babu (Offline)</p>
                <p className="text-xs text-slate-400">Telecaller inactive during core calling hours</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">Notified</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Admissions Velocity" description="Top converting counselors this month">
          <div className="space-y-3">
            {telecallers.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {t.avatarInitials}
                  </div>
                  <span className="font-semibold text-slate-800">{t.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">{t.applications} applications</span>
                  <span className="font-bold text-emerald-600">{t.admissions} admissions closed</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. ADMIN EXECUTIVE DASHBOARD
// ─────────────────────────────────────────────────────────────
function AdminDashboard() {
  const router = useRouter();
  const { branch } = useBranch();
  useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);
  const sources = getSources(branch);

  const leads = getLeads(branch);
  const telecallers = getTelecallers(branch);
  const overdue = getFollowUps(branch).filter((f) => f.status === "Overdue");
  const followUps = getFollowUps(branch);
  const applications = getApplications(branch);
  const admissions = getAdmissions(branch);

  const dynamicKpiValue = (key: string, defaultValue: number) => {
    switch (key) {
      case "total": return leads.length;
      case "new": return leads.filter((l) => l.stage === "New").length;
      case "unassigned": return leads.filter((l) => !l.assignedTo).length;
      case "assigned": return leads.filter((l) => !!l.assignedTo).length;
      case "followups": return followUps.length;
      case "interested": return leads.filter((l) => l.stage === "Interested" || l.status === "Interested").length;
      case "applications": return applications.length;
      case "admissions": return admissions.length;
      default: return defaultValue;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Executive Dashboard"
        subtitle={`Your admissions pipeline, organizational revenue & operations for ${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"}.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" /> {branch === "masters" ? "Masters Division" : "MBBS Division"}
            </span>
            <Button variant="outline" asChild>
              <Link href="/operations">
                Lead Operations <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="dashboard-kpis grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = icons[k.icon] ?? Users;
          return (
            <KpiCard
              key={k.key}
              label={k.label}
              value={dynamicKpiValue(k.key, k.value).toLocaleString("en-IN")}
              trend={k.trend}
              icon={<Icon className="size-4" />}
              onClick={() => {
                if (k.key === "followups") router.push("/follow-ups");
                else if (k.key === "applications") router.push("/applications");
                else if (k.key === "admissions") router.push("/admissions");
                else if (k.key === "unassigned") router.push("/leads?view=unassigned");
                else if (k.key === "assigned") router.push("/leads?view=assigned");
                else if (k.key === "new") router.push("/leads?stage=New");
                else if (k.key === "interested") router.push("/leads?stage=Interested");
                else router.push("/leads");
              }}
            />
          );
        })}
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <LeadTrend leads={leads} />
        </div>
        <div className="min-w-0">
          <SourceDonut sources={sources} onSelect={() => router.push("/sources")} />
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Panel
          title="Admissions pipeline"
          description="Sample funnel · first enquiry to conversion"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analytics">
                View analytics <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="mb-5 flex items-baseline gap-2">
            <span className="text-numeric text-3xl font-semibold">
              {(
                ((funnelStages.find((stage) => stage.stage === "Admission")?.value ?? 0) /
                  Math.max(funnelStages[0]?.value ?? 0, 1)) *
                100
              ).toFixed(1)}
              %
            </span>
            <span className="text-xs text-muted-foreground">lead → admission</span>
          </div>
          <PipelineChart
            stages={funnelStages}
            onSelect={(stage) => router.push(`/leads?stage=${encodeURIComponent(stage)}`)}
          />
        </Panel>
        <div className="min-w-0">
          <TeamChart team={telecallers} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Live Activity"
          actions={
            <Link href="/audit" className="text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="ml-1 inline size-3" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {activityFeed.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No recent activity yet. Real-time leads and team actions will appear here.
            </div>
          ) : (
            <ul>
              {activityFeed.map((a, i) => (
                <li key={i} className="relative flex gap-3 px-5 py-3.5 border-b border-border/50 last:border-b-0">
                  <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Activity className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-5">{a.text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{a.at}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

        </Panel>
        <Panel title="Lead Sources" description="Conversion by acquisition channel" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Source", "Leads", "Contacted", "Interested", "Applications", "Admissions"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((s) => (
                  <tr key={s.name} className="hover:bg-accent/40">
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-numeric">{s.leads}</td>
                    <td className="px-3 py-2 text-numeric">{s.contacted}</td>
                    <td className="px-3 py-2 text-numeric">{s.interested}</td>
                    <td className="px-3 py-2 text-numeric">{s.applications}</td>
                    <td className="px-3 py-2 text-numeric">{s.admissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Needs attention" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            <li className="flex items-center justify-between px-5 py-3">
              <span className="text-sm">Unassigned leads</span>
              <Link href="/operations" className="text-sm font-semibold text-brand hover:underline">
                {leads.filter((l) => !l.assignedTo).length}
              </Link>
            </li>
            <li className="flex items-center justify-between px-5 py-3">
              <span className="text-sm">Overdue follow-ups</span>
              <Link href="/follow-ups" className="text-sm font-semibold text-destructive hover:underline">
                {overdue.length}
              </Link>
            </li>
            <li className="flex items-center justify-between px-5 py-3">
              <span className="text-sm">Possible duplicates</span>
              <Link href="/operations" className="text-sm font-semibold text-warning hover:underline">
                8
              </Link>
            </li>
          </ul>
        </Panel>

        <Panel title="Team today" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {telecallers.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {t.avatarInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.currentActivity}</p>
                </div>
                <StatusBadge value={t.presence} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
