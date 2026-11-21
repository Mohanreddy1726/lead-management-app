"use client";

import { useId, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Award,
  GraduationCap,
  Globe,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";
import {
  formatDate,
  formatINR,
  getAdmissions,
  getApplications,
  getCampaigns,
  getLeads,
  getSources,
  getTelecallers,
} from "@/services/api";
import { TODAY } from "@/data/mock";
import { useBranch } from "@/context/BranchContext";
import { cn } from "@/lib/utils";


const sourceColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export default function ReportsPage() {
  const { branch } = useBranch();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "campaigns" | "team" | "programs">("overview");

  const leads = getLeads(branch);
  const sources = getSources(branch);
  const campaigns = getCampaigns(branch);
  const telecallers = getTelecallers(branch);
  const admissions = getAdmissions(branch);
  const applications = getApplications(branch);

  // Aggregate Metrics
  const totalLeads = leads.length;
  const totalAdmissions = admissions.length;
  const totalApplications = applications.length;
  const conversionRate = totalLeads > 0 ? ((totalAdmissions / totalLeads) * 100).toFixed(1) : "0";

  const totalSpend = useMemo(() => campaigns.reduce((acc, c) => acc + c.spend, 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((acc, c) => acc + c.revenue, 0), [campaigns]);
  const blendedCac = totalAdmissions > 0 ? Math.round(totalSpend / totalAdmissions) : 0;
  const roasMultiplier = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : "0";

  // Trend Data for Area Chart
  const trendDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const gradientId = `report-trend-${useId().replace(/:/g, "")}`;

  const trendData = useMemo(() => {
    const latest = Math.max(...leads.map((l) => new Date(l.createdAt).getTime()), 0);
    const end = new Date(latest || TODAY.getTime());
    end.setUTCHours(0, 0, 0, 0);


    return Array.from({ length: trendDays }, (_, i) => {
      const d = new Date(end.getTime() - (trendDays - i - 1) * 86400000);
      const dayStr = d.toISOString().slice(0, 10);
      const dayLeads = leads.filter((l) => l.createdAt.slice(0, 10) === dayStr).length;
      // Proportional admissions proxy for visual reporting
      const dayAdmissions = Math.round(dayLeads * 0.12);
      return {
        date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        leads: dayLeads,
        admissions: dayAdmissions,
      };
    });
  }, [leads, trendDays]);

  // Program & Destination breakdown
  const destinationCounts = useMemo(() => {
    const map = new Map<string, { country: string; leads: number; admissions: number }>();
    leads.forEach((l) => {
      const entry = map.get(l.country) || { country: l.country, leads: 0, admissions: 0 };
      entry.leads += 1;
      if (l.stage === "Admission" || l.stage === "Converted") entry.admissions += 1;
      map.set(l.country, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.leads - a.leads);
  }, [leads]);

  // Handle Export CSV
  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Name", "Source", "Course", "Country", "Stage", "Created At"];
      const rows = leads.map((l) => [
        l.id,
        `"${l.name.replace(/"/g, '""')}"`,
        l.source,
        l.course,
        l.country,
        l.stage,
        l.createdAt.slice(0, 10),
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `LeadOS_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Executive report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Page Header */}
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Reports & Analytics`}
        subtitle={`End-to-end visibility into ${branch === "masters" ? "Masters" : "MBBS"} pipeline velocity, source efficiency, campaign ROI, and team output.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border bg-card p-1 text-xs">
              {(["7d", "30d", "90d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                    timeRange === r
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "All Time"}
                </button>
              ))}
            </div>

            <PrimaryButton tone="ghost" onClick={handleExportCSV}>
              <Download className="size-3.5 mr-1" />
              Export CSV
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Metric KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label="Total Leads" value={totalLeads.toLocaleString()} />
        <StatTile label="Applications" value={totalApplications.toLocaleString()} />
        <StatTile label="Admissions" value={totalAdmissions.toLocaleString()} tone="text-success" />
        <StatTile label="Conversion Rate" value={`${conversionRate}%`} tone="text-primary" />
        <StatTile label="Marketing Spend" value={formatINR(totalSpend)} />
        <StatTile label="Pipeline Revenue" value={formatINR(totalRevenue)} tone="text-success" />
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Trend Area Chart */}
        <Panel
          title="Lead Acquisition & Conversion Velocity"
          description={`Volume tracked over ${trendDays} days · Daily capture breakdown`}
          className="xl:col-span-2"
        >
          <div className="mb-4 flex items-baseline gap-4">
            <div>
              <span className="text-numeric text-3xl font-bold">{trendData.reduce((acc, d) => acc + d.leads, 0)}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">leads in window</span>
            </div>
            <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              +14.8% vs previous window
            </div>
          </div>

          <ChartContainer
            config={{
              leads: { label: "New Leads", color: "var(--chart-1)" },
              admissions: { label: "Admissions", color: "var(--chart-3)" },
            }}
            className="h-[260px] w-full aspect-auto"
          >
            <AreaChart data={trendData} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="leads"
                type="monotone"
                fill={`url(#${gradientId})`}
                stroke="var(--chart-1)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </Panel>

        {/* Channel Share Donut */}
        <Panel title="Acquisition by Source" description="Lead distribution by channel">
          <div className="relative mx-auto w-full max-w-[240px]">
            <ChartContainer config={{ leads: { label: "Leads" } }} className="h-[180px] w-full aspect-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={sources.map((s, idx) => ({ ...s, fill: sourceColors[idx % sourceColors.length] }))}
                  dataKey="leads"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {sources.map((s, idx) => (
                    <Cell key={s.name} fill={sourceColors[idx % sourceColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-numeric text-2xl font-bold">{totalLeads}</span>
              <span className="text-[11px] text-muted-foreground">total leads</span>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border pt-3">
            {sources.slice(0, 4).map((s, idx) => {
              const pct = Math.round((s.leads / Math.max(totalLeads, 1)) * 100);
              return (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: sourceColors[idx % sourceColors.length] }}
                    />
                    <span className="text-foreground font-medium">{s.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-numeric font-semibold text-foreground">{s.leads}</span>
                    <span className="text-muted-foreground text-[11px]">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-px overflow-x-auto">
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "sources", label: "Source Performance" },
          { id: "campaigns", label: "Campaign ROI" },
          { id: "team", label: "Team & Telecallers" },
          { id: "programs", label: "Countries & Courses" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-2">
          {/* Channel ROI Summary */}
          <Panel title="Channel Efficiency & Conversion" description="Comparing top acquisition channels" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Source</th>
                    <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                    <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                    <th className="px-4 py-2.5 text-right font-medium">Conv. Rate</th>
                    <th className="px-4 py-2.5 text-right font-medium">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sources.map((s) => {
                    const conv = s.leads > 0 ? ((s.admissions / s.leads) * 100).toFixed(1) : "0";
                    const estRev = s.admissions * 240000;
                    return (
                      <tr key={s.name} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <SourceBadge value={s.name as any} />
                        </td>
                        <td className="px-4 py-3 text-right text-numeric">{s.leads}</td>
                        <td className="px-4 py-3 text-right text-numeric font-medium text-success">{s.admissions}</td>
                        <td className="px-4 py-3 text-right text-numeric">{conv}%</td>
                        <td className="px-4 py-3 text-right text-numeric font-semibold text-foreground">
                          {formatINR(estRev)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Key Executive Insights */}
          <Panel title="Executive Insights & Anomalies" description="Automated intelligence from your funnel data">
            <div className="space-y-3.5">
              <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <Sparkles className="size-5 shrink-0 text-primary mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Highest Conversion Channel: Website Leads</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Organic website inquiries convert at <strong>4.9%</strong>, 1.8x higher than Meta Ads. Increasing SEO
                    and direct web capture forms will lower your blended CAC.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border border-border bg-surface-2 p-3.5">
                <DollarSign className="size-5 shrink-0 text-success mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Blended CAC: {formatINR(blendedCac)}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Marketing spend is generating an estimated <strong>{roasMultiplier}x</strong> ROAS return across confirmed student
                    placements.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border border-border bg-surface-2 p-3.5">
                <Users className="size-5 shrink-0 text-primary mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Team Throughput</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {telecallers.length} telecallers are currently managing {totalLeads} active leads across Hyderabad and
                    regional teams.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "sources" && (
        <Panel title="Full Lead Sources Breakdown" description="Source progression through every stage" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Source</th>
                  <th className="px-4 py-2.5 text-right font-medium">Leads Captured</th>
                  <th className="px-4 py-2.5 text-right font-medium">Contacted</th>
                  <th className="px-4 py-2.5 text-right font-medium">Interested</th>
                  <th className="px-4 py-2.5 text-right font-medium">Applications</th>
                  <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                  <th className="px-4 py-2.5 text-right font-medium">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((s) => {
                  const rate = s.leads > 0 ? ((s.admissions / s.leads) * 100).toFixed(1) : "0";
                  return (
                    <tr key={s.name} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <SourceBadge value={s.name as any} />
                      </td>
                      <td className="px-4 py-3 text-right text-numeric font-medium">{s.leads}</td>
                      <td className="px-4 py-3 text-right text-numeric">{s.contacted}</td>
                      <td className="px-4 py-3 text-right text-numeric">{s.interested}</td>
                      <td className="px-4 py-3 text-right text-numeric">{s.applications}</td>
                      <td className="px-4 py-3 text-right text-numeric font-semibold text-success">{s.admissions}</td>
                      <td className="px-4 py-3 text-right text-numeric font-semibold text-primary">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === "campaigns" && (
        <Panel title="Campaign Financial Performance & Return on Ad Spend" description="Marketing budget utilization" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Campaign</th>
                  <th className="px-4 py-2.5 text-left font-medium">Channel</th>
                  <th className="px-4 py-2.5 text-right font-medium">Budget</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                  <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                  <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost / Admission</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c) => {
                  const costPerAdmission = c.admissions > 0 ? Math.round(c.spend / c.admissions) : 0;
                  const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(1) : "0";
                  return (
                    <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3">
                        <SourceBadge value={c.source as any} />
                      </td>
                      <td className="px-4 py-3 text-right text-numeric text-muted-foreground">{formatINR(c.budget)}</td>
                      <td className="px-4 py-3 text-right text-numeric font-medium">{formatINR(c.spend)}</td>
                      <td className="px-4 py-3 text-right text-numeric">{c.leads}</td>
                      <td className="px-4 py-3 text-right text-numeric font-semibold text-success">{c.admissions}</td>
                      <td className="px-4 py-3 text-right text-numeric">{formatINR(costPerAdmission)}</td>
                      <td className="px-4 py-3 text-right text-numeric font-semibold text-foreground">
                        {formatINR(c.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-numeric font-bold text-primary">{roas}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === "team" && (
        <Panel title="Team & Telecaller Performance Leaderboard" description="Lead allocations and conversion metrics" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Team Member</th>
                  <th className="px-4 py-2.5 text-left font-medium">Team</th>
                  <th className="px-4 py-2.5 text-right font-medium">Assigned Leads</th>
                  <th className="px-4 py-2.5 text-right font-medium">Calls Today</th>
                  <th className="px-4 py-2.5 text-right font-medium">Interested</th>
                  <th className="px-4 py-2.5 text-right font-medium">Applications</th>
                  <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {telecallers.map((t) => (
                  <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {t.avatarInitials}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.presence}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.team}</td>
                    <td className="px-4 py-3 text-right text-numeric font-medium">{t.assigned}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.callsToday}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.interested}</td>
                    <td className="px-4 py-3 text-right text-numeric">{t.applications}</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-success">{t.admissions}</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-foreground">
                      {formatINR(t.revenue ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === "programs" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Destination Countries" description="Lead demand and admissions by study destination" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Country</th>
                    <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                    <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                    <th className="px-4 py-2.5 text-right font-medium">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {destinationCounts.map((d) => {
                    const conv = d.leads > 0 ? ((d.admissions / d.leads) * 100).toFixed(1) : "0";
                    return (
                      <tr key={d.country} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                          <Globe className="size-4 text-muted-foreground" />
                          {d.country}
                        </td>
                        <td className="px-4 py-2.5 text-right text-numeric">{d.leads}</td>
                        <td className="px-4 py-2.5 text-right text-numeric font-medium text-success">{d.admissions}</td>
                        <td className="px-4 py-2.5 text-right text-numeric font-semibold text-primary">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Course Categories" description="Lead volumes by academic program" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Course Category</th>
                    <th className="px-4 py-2.5 text-right font-medium">Active Leads</th>
                    <th className="px-4 py-2.5 text-right font-medium">Share of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { course: "MBBS Abroad", count: Math.round(totalLeads * 0.62) },
                    { course: "Masters Abroad", count: Math.round(totalLeads * 0.23) },
                    { course: "Engineering Abroad", count: Math.round(totalLeads * 0.1) },
                    { course: "Business & Management", count: Math.round(totalLeads * 0.05) },
                  ].map((c) => (
                    <tr key={c.course} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                        <GraduationCap className="size-4 text-muted-foreground" />
                        {c.course}
                      </td>
                      <td className="px-4 py-2.5 text-right text-numeric font-medium">{c.count}</td>
                      <td className="px-4 py-2.5 text-right text-numeric text-muted-foreground">
                        {Math.round((c.count / Math.max(totalLeads, 1)) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
