"use client";

import { useId, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Headphones,
  PhoneCall,
  Clock,
  Award,
  TrendingUp,
  Target,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Download,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { StatusBadge } from "@/components/shared/badges";
import { formatINR, getCalls, getLeads, getTelecallers } from "@/services/api";
import { cn } from "@/lib/utils";

export default function TelecallerAnalyticsPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [selectedCallerId, setSelectedCallerId] = useState<string>("");

  const telecallers = getTelecallers();
  const leads = getLeads();
  const calls = getCalls();

  // Filter telecallers
  const filteredTelecallers = useMemo(() => {
    if (selectedTeam === "All") return telecallers;
    return telecallers.filter((t) => t.team.includes(selectedTeam));
  }, [telecallers, selectedTeam]);

  // Aggregate metrics
  const totalAssigned = useMemo(() => filteredTelecallers.reduce((acc, t) => acc + t.assigned, 0), [filteredTelecallers]);
  const totalCallsToday = useMemo(() => filteredTelecallers.reduce((acc, t) => acc + t.callsToday, 0), [filteredTelecallers]);
  const totalApplications = useMemo(() => filteredTelecallers.reduce((acc, t) => acc + t.applications, 0), [filteredTelecallers]);
  const totalAdmissions = useMemo(() => filteredTelecallers.reduce((acc, t) => acc + t.admissions, 0), [filteredTelecallers]);
  const totalRevenue = useMemo(() => filteredTelecallers.reduce((acc, t) => acc + (t.revenue || 0), 0), [filteredTelecallers]);

  const avgCallsPerCaller = filteredTelecallers.length > 0 ? Math.round(totalCallsToday / filteredTelecallers.length) : 0;
  const teamConvRate = totalAssigned > 0 ? ((totalAdmissions / totalAssigned) * 100).toFixed(1) : "0";

  // Comparison Bar Chart (Calls vs Admissions by Telecaller)
  const comparisonData = useMemo(() => {
    return filteredTelecallers.map((t) => ({
      name: t.name.split(" ")[0],
      fullName: t.name,
      callsToday: t.callsToday,
      admissions: t.admissions,
      revenue: t.revenue || 0,
      assigned: t.assigned,
    }));
  }, [filteredTelecallers]);

  // Handle Export
  const handleExport = () => {
    try {
      const headers = ["Telecaller", "Team", "Presence", "Assigned", "Calls_Today", "Interested", "Applications", "Admissions", "Conv_Rate", "Revenue"];
      const rows = filteredTelecallers.map((t) => [
        `"${t.name}"`,
        `"${t.team}"`,
        t.presence,
        t.assigned,
        t.callsToday,
        t.interested,
        t.applications,
        t.admissions,
        t.assigned > 0 ? ((t.admissions / t.assigned) * 100).toFixed(1) + "%" : "0%",
        t.revenue || 0,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encoded = encodeURI(csv);
      const a = document.createElement("a");
      a.href = encoded;
      a.download = `Telecaller_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Telecaller performance CSV exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Page Header */}
      <PageHeader
        title="Telecaller Analytics & Workforce Productivity"
        subtitle="Individual and team outbound call velocity, talk duration, lead conversion efficiency, and admissions revenue."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by Team"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Teams</option>
              <option value="Hyderabad">Hyderabad Team</option>
              <option value="Vijayawada">Vijayawada Team</option>
              <option value="Visakhapatnam">Visakhapatnam Team</option>
            </select>

            <PrimaryButton tone="ghost" onClick={handleExport}>
              <Download className="size-3.5 mr-1" />
              Export Performance
            </PrimaryButton>
          </div>
        }
      />

      {/* KPI Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label="Active Counsellors" value={filteredTelecallers.length} />
        <StatTile label="Total Calls Today" value={totalCallsToday.toLocaleString()} tone="text-primary" />
        <StatTile label="Avg Calls / Counsellor" value={avgCallsPerCaller} />
        <StatTile label="Applications Secured" value={totalApplications} />
        <StatTile label="Admissions Secured" value={totalAdmissions} tone="text-success" />
        <StatTile label="Team Conversion Rate" value={`${teamConvRate}%`} tone="text-primary" />
      </div>

      {/* Main Productivity Visualization */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Calls & Admissions Bar Chart */}
        <Panel
          title="Counsellor Call Volume vs Confirmed Admissions"
          description="High calling velocity directly correlates with admissions yield"
          className="xl:col-span-2"
        >
          <ChartContainer
            config={{
              callsToday: { label: "Calls Today", color: "var(--chart-1)" },
              admissions: { label: "Admissions", color: "var(--chart-3)" },
            }}
            className="h-[280px] w-full aspect-auto"
          >
            <BarChart data={comparisonData} margin={{ left: -15, right: 8, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="callsToday" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="admissions" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-indigo-600" />
              <span>Calls Today</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-600" />
              <span>Confirmed Admissions</span>
            </div>
          </div>
        </Panel>

        {/* Shift Summary & Quota Progress */}
        <Panel title="Daily Shift Targets" description="Telecaller quota pacing for today">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Team Call Target (400 Calls)</span>
                <span className="text-numeric font-bold text-foreground">
                  {totalCallsToday} / 400 ({Math.min(Math.round((totalCallsToday / 400) * 100), 100)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(Math.round((totalCallsToday / 400) * 100), 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Monthly Admissions (60 Goal)</span>
                <span className="text-numeric font-bold text-success">
                  {totalAdmissions} / 60 ({Math.min(Math.round((totalAdmissions / 60) * 100), 100)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${Math.min(Math.round((totalAdmissions / 60) * 100), 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border p-3.5 space-y-2 text-xs">
              <span className="font-semibold text-foreground block">Top Performer of the Week</span>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    VK
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Vennela Kondapalli</p>
                    <p className="text-[11px] text-muted-foreground">11 Admissions · 9.8% Conv.</p>
                  </div>
                </div>
                <Link
                  href="/team/tc-1"
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  Profile <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Full Telecaller Performance Leaderboard Table */}
      <Panel title="Telecaller Productivity & Conversion Leaderboard" description="Real-time counsellor activity and intake conversions" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Counsellor</th>
                <th className="px-4 py-2.5 text-left font-medium">Team</th>
                <th className="px-4 py-2.5 text-left font-medium">Presence</th>
                <th className="px-4 py-2.5 text-right font-medium">Assigned</th>
                <th className="px-4 py-2.5 text-right font-medium">Calls Today</th>
                <th className="px-4 py-2.5 text-right font-medium">Follow-ups</th>
                <th className="px-4 py-2.5 text-right font-medium">Interested</th>
                <th className="px-4 py-2.5 text-right font-medium">Applications</th>
                <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                <th className="px-4 py-2.5 text-right font-medium">Conversion %</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTelecallers.map((t) => {
                const convRate = t.assigned > 0 ? ((t.admissions / t.assigned) * 100).toFixed(1) : "0";
                return (
                  <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/team/${t.id}`} className="flex items-center gap-2.5 hover:text-primary transition-colors">
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {t.avatarInitials}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.role}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.team}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                        t.presence === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground",
                      )}>
                        <span className={cn("size-1.5 rounded-full", t.presence === "Active" ? "bg-emerald-500" : "bg-muted-foreground")} />
                        {t.presence}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-numeric font-medium">{t.assigned}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.callsToday}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.followUps}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.interested}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.applications}</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-success">{t.admissions}</td>
                    <td className="px-4 py-3 text-right text-numeric font-bold text-primary">{convRate}%</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-foreground">
                      {formatINR(t.revenue || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Coaching & Performance Guidance */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="size-4 shrink-0" />
            Speed-to-Call Best Practice
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Telecallers calling leads within 5 minutes of form submission achieve a 72% contact rate vs 41% after 1 hour.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            Follow-up Discipline
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Counsellors logging follow-up callbacks within 48 hours show 2.4x higher transition from Counselling to Application.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Target className="size-4 shrink-0 text-muted-foreground" />
            Active Queue Management
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Telecallers with more than 120 assigned leads should use the Least Assigned routing rule to balance workload.
          </p>
        </div>
      </div>
    </div>
  );
}
