"use client";

import { useId, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrendingUp,
  Clock,
  PhoneCall,
  Target,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Users,
  Compass,
  FileText,
  PhoneForwarded,
  Activity,
  Layers,
  ArrowUpRight,
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
import { ScoreBadge, StatusBadge, SourceBadge } from "@/components/shared/badges";
import {
  getCalls,
  getCampaigns,
  getLeads,
  getSources,
  getTelecallers,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { STAGES } from "@/data/mock";
import { cn } from "@/lib/utils";

const outcomeColors: Record<string, string> = {
  Connected: "var(--chart-3)",
  Interested: "var(--chart-1)",
  "Call Back": "var(--chart-6)",
  "No Answer": "var(--chart-5)",
  Busy: "var(--chart-2)",
  "Not Interested": "var(--muted)",
  "Wrong Number": "var(--chart-4)",
  "Parent Discussion Required": "var(--chart-1)",
};

export default function AnalyticsPage() {
  const { branch } = useBranch();
  const [windowPeriod, setWindowPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [courseFilter, setCourseFilter] = useState<string>("All");

  const allLeads = getLeads(branch);
  const allCalls = getCalls(branch);
  const sources = getSources(branch);
  const telecallers = getTelecallers(branch);

  // Filter leads based on course selection
  const leads = useMemo(() => {
    if (courseFilter === "All") return allLeads;
    return allLeads.filter((l) => l.course === courseFilter);
  }, [allLeads, courseFilter]);

  // Stage Volume & Velocity Calculations
  const stageStats = useMemo(() => {
    return STAGES.map((st, index) => {
      const stageLeads = leads.filter((l) => l.stage === st);
      const atLeastCount = leads.filter((l) => STAGES.indexOf(l.stage) >= index).length;
      const priorCount = index > 0 ? leads.filter((l) => STAGES.indexOf(l.stage) >= index - 1).length : atLeastCount;
      const stepConversion = priorCount > 0 ? Math.round((atLeastCount / priorCount) * 100) : 100;

      // Realistic dwell time in days per stage
      const dwellDays = [0.5, 1.4, 3.2, 4.8, 6.5, 9.2, 11.0, 14.5, 21.0][index] || 2;

      return {
        stage: st,
        count: stageLeads.length,
        cumulative: atLeastCount,
        conversion: stepConversion,
        dwellDays,
      };
    });
  }, [leads]);

  // Lead Score Bands Analysis
  const scoreBands = useMemo(() => {
    const bands = [
      { range: "80 - 100", label: "Very High", min: 80, max: 100, color: "var(--chart-3)", tone: "text-emerald-600" },
      { range: "60 - 79", label: "High", min: 60, max: 79, color: "var(--chart-1)", tone: "text-indigo-600" },
      { range: "40 - 59", label: "Medium", min: 40, max: 59, color: "var(--chart-6)", tone: "text-amber-600" },
      { range: "< 40", label: "Low", min: 0, max: 39, color: "var(--chart-5)", tone: "text-rose-600" },
    ];

    return bands.map((b) => {
      const inBand = leads.filter((l) => l.score >= b.min && l.score <= b.max);
      const admitted = inBand.filter((l) => l.stage === "Admission" || l.stage === "Converted").length;
      const convRate = inBand.length > 0 ? Math.round((admitted / inBand.length) * 100) : 0;
      return {
        ...b,
        leads: inBand.length,
        admitted,
        convRate,
      };
    });
  }, [leads]);

  // Call Outcomes Breakdown
  const callOutcomesData = useMemo(() => {
    const counts = new Map<string, number>();
    allCalls.forEach((c) => {
      counts.set(c.outcome, (counts.get(c.outcome) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([outcome, count], idx) => ({
      name: outcome,
      value: count,
      fill: outcomeColors[outcome] || `var(--chart-${(idx % 6) + 1})`,
    }));
  }, [allCalls]);

  // Peak Calling Connect Rates by Hour
  const hourlyConnects = useMemo(() => [
    { hour: "9 AM", connectRate: 42, calls: 45 },
    { hour: "10 AM", connectRate: 68, calls: 92 },
    { hour: "11 AM", connectRate: 74, calls: 110 },
    { hour: "12 PM", connectRate: 61, calls: 78 },
    { hour: "1 PM", connectRate: 38, calls: 40 },
    { hour: "2 PM", connectRate: 52, calls: 64 },
    { hour: "3 PM", connectRate: 71, calls: 98 },
    { hour: "4 PM", connectRate: 76, calls: 115 },
    { hour: "5 PM", connectRate: 65, calls: 86 },
    { hour: "6 PM", connectRate: 54, calls: 58 },
  ], []);

  // Geographic City Performance
  const cityStats = useMemo(() => {
    const map = new Map<string, { city: string; leads: number; admissions: number; avgScore: number; scoreSum: number }>();
    leads.forEach((l) => {
      const entry = map.get(l.city) || { city: l.city, leads: 0, admissions: 0, avgScore: 0, scoreSum: 0 };
      entry.leads += 1;
      entry.scoreSum += l.score;
      if (l.stage === "Admission" || l.stage === "Converted") entry.admissions += 1;
      entry.avgScore = Math.round(entry.scoreSum / entry.leads);
      map.set(l.city, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.leads - a.leads).slice(0, 6);
  }, [leads]);

  // Stalled Leads Attrition Risk
  const stalledLeads = useMemo(() => {
    return leads
      .filter((l) => l.stage === "Counselling" || l.stage === "Application" || l.stage === "Documentation")
      .slice(0, 4);
  }, [leads]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Page Header */}
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Pipeline Analytics`}
        subtitle={`Stage velocity, propensity scoring, telecaller contact efficiency, and attrition drop-offs for ${branch === "masters" ? "Masters" : "MBBS"}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Course */}
            <select
              aria-label="Filter by Course"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Courses</option>
              <option value="MBBS Abroad">MBBS Abroad</option>
              <option value="Masters Abroad">Masters Abroad</option>
            </select>

            {/* Time Window Buttons */}
            <div className="flex rounded-lg border border-border bg-card p-1 text-xs">
              {(["7d", "30d", "90d", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setWindowPeriod(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                    windowPeriod === p
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "7d" ? "7D" : p === "30d" ? "30D" : p === "90d" ? "90D" : "All"}
                </button>
              ))}
            </div>

            <PrimaryButton
              tone="primary"
              onClick={() => toast.success("Analytics recalculated for current cohort")}
            >
              <Activity className="size-3.5 mr-1" />
              Recalculate
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Intelligence KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Pipeline Velocity" value="21.4 Days" tone="text-foreground" />
        <StatTile label="Average Lead Score" value="68.4 / 100" tone="text-primary" />
        <StatTile label="Call Connect Rate" value="64.8%" tone="text-success" />
        <StatTile label="High-Propensity Conv." value="38.5%" tone="text-emerald-600" />
        <StatTile label="Stalled Leads (Risk)" value={`${stalledLeads.length} leads`} tone="text-warning" />
      </div>

      {/* 9-Stage Funnel Velocity & Drop-Off Analyzer */}
      <Panel
        title="Full Pipeline Progression & Dwell Times"
        description="Lead progression across all 9 operational stages · Dwell time indicates average days spent in stage"
      >
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-9">
          {stageStats.map((st, i) => (
            <div
              key={st.stage}
              className={cn(
                "rounded-lg border p-3 flex flex-col justify-between transition-all hover:border-primary/50 bg-card",
                i === 0
                  ? "border-primary/40 bg-primary/5"
                  : i >= 7
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border",
              )}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="font-semibold text-primary">{i + 1}</span>
                  <span>{st.dwellDays}d avg</span>
                </div>
                <p className="font-medium text-xs text-foreground truncate">{st.stage}</p>
                <p className="text-xl font-bold text-numeric text-foreground mt-1.5">{st.count}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-border/60 text-[11px] flex items-center justify-between">
                <span className="text-muted-foreground">Conv.</span>
                <span className={cn("font-semibold text-numeric", st.conversion < 40 ? "text-destructive" : "text-success")}>
                  {st.conversion}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Middle Row: Score Propensity & Best Calling Hours */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Lead Score Correlation with Conversion */}
        <Panel
          title="Lead Score Band vs Conversion Rate"
          description="High-score leads convert at up to 7x the rate of cold leads"
        >
          <div className="mb-4 grid grid-cols-4 gap-2 text-center text-xs">
            {scoreBands.map((b) => (
              <div key={b.range} className="rounded-lg border border-border bg-surface-2 p-2.5">
                <div className="text-[11px] font-medium text-muted-foreground">{b.label}</div>
                <div className="text-xs font-semibold text-foreground">{b.range}</div>
                <div className={cn("mt-1 text-base font-bold text-numeric", b.tone)}>{b.convRate}% conv.</div>
                <div className="text-[10px] text-muted-foreground">{b.leads} leads</div>
              </div>
            ))}
          </div>

          <ChartContainer
            config={{
              convRate: { label: "Conversion Rate %", color: "var(--chart-1)" },
              leads: { label: "Total Leads", color: "var(--chart-3)" },
            }}
            className="h-[220px] w-full aspect-auto"
          >
            <BarChart data={scoreBands} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="convRate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {scoreBands.map((entry) => (
                  <Cell key={entry.range} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>

        {/* Peak Calling Hours Heatmap / Connect Rates */}
        <Panel
          title="Peak Call Connection Hours"
          description="Average connect rate % throughout calling shifts (9:00 AM – 6:00 PM)"
        >
          <div className="mb-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Optimal telecalling windows:</span>
            <span className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded px-2 py-0.5">
              10:00 AM - 12:00 PM & 3:00 PM - 5:00 PM
            </span>
          </div>

          <ChartContainer
            config={{
              connectRate: { label: "Connect Rate %", color: "var(--chart-3)" },
            }}
            className="h-[220px] w-full aspect-auto"
          >
            <BarChart data={hourlyConnects} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="connectRate" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {hourlyConnects.map((entry) => (
                  <Cell
                    key={entry.hour}
                    fill={entry.connectRate >= 70 ? "var(--chart-3)" : entry.connectRate >= 50 ? "var(--chart-1)" : "var(--chart-5)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Panel>
      </div>

      {/* Third Row: Call Outcomes & Geographic Cohorts */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Call Outcomes Distribution */}
        <Panel title="Call Outcome Breakdown" description="Distribution of conversation dispositions">
          <div className="relative mx-auto w-full max-w-[240px]">
            <ChartContainer config={{ value: { label: "Calls" } }} className="h-[180px] w-full aspect-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={callOutcomesData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {callOutcomesData.map((c) => (
                    <Cell key={c.name} fill={c.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-numeric text-2xl font-bold">{allCalls.length}</span>
              <span className="text-[11px] text-muted-foreground">logged calls</span>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border pt-3">
            {callOutcomesData.slice(0, 5).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                  <span className="text-foreground truncate max-w-[140px]">{c.name}</span>
                </span>
                <span className="text-numeric font-semibold text-foreground">{c.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Geographic Hubs Table */}
        <Panel title="Top Student Cohorts by City" description="City volumes and lead qualification rates" className="xl:col-span-2" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">City</th>
                  <th className="px-4 py-2.5 text-right font-medium">Leads Captured</th>
                  <th className="px-4 py-2.5 text-right font-medium">Avg Lead Score</th>
                  <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                  <th className="px-4 py-2.5 text-right font-medium">Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cityStats.map((c) => {
                  const rate = c.leads > 0 ? ((c.admissions / c.leads) * 100).toFixed(1) : "0";
                  return (
                    <tr key={c.city} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{c.city}</td>
                      <td className="px-4 py-2.5 text-right text-numeric font-medium">{c.leads}</td>
                      <td className="px-4 py-2.5 text-right">
                        <ScoreBadge score={c.avgScore} showBand={false} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-numeric font-semibold text-success">{c.admissions}</td>
                      <td className="px-4 py-2.5 text-right text-numeric font-bold text-primary">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* AI Pipeline Diagnostics & Bottleneck Alerts */}
      <Panel
        title="AI Pipeline Diagnostics & Action Items"
        description="Automated bottleneck detection to boost counselling and application conversions"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0" />
              Bottleneck: Documentation Stage
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              18 students have been stuck in documentation for over 12 days awaiting passport & apostille notarization.
            </p>
            <div className="pt-2">
              <Link
                href="/leads?stage=Documentation"
                className="text-xs font-medium text-amber-600 hover:underline inline-flex items-center gap-1"
              >
                Review stalled leads <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              Top Converting Source: Meta Ads
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Meta Ads MBBS campaigns have produced 42% of this month&apos;s admissions at an efficient cost per acquisition.
            </p>
            <div className="pt-2">
              <Link
                href="/campaigns"
                className="text-xs font-medium text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                View campaign funnel <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <Sparkles className="size-4 shrink-0" />
              Counsellor Capacity Optimization
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hyderabad Telecaller Team has 84 unassigned leads ready for routing via Round Robin or Location rule.
            </p>
            <div className="pt-2">
              <Link
                href="/assignment"
                className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                Configure routing rules <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
