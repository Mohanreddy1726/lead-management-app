"use client";

import { useId, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  Filter,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";
import { formatDate, formatINR, getCampaigns, getLeads } from "@/services/api";
import { cn } from "@/lib/utils";

export default function CampaignAnalyticsPage() {
  const [selectedChannel, setSelectedChannel] = useState<string>("All");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const allCampaigns = getCampaigns();
  const leads = getLeads();

  const campaigns = useMemo(() => {
    if (selectedChannel === "All") return allCampaigns;
    return allCampaigns.filter((c) => c.source === selectedChannel);
  }, [allCampaigns, selectedChannel]);

  const activeCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0] || allCampaigns[0];
  }, [campaigns, selectedCampaignId, allCampaigns]);

  // Aggregate stats
  const totalBudget = useMemo(() => campaigns.reduce((acc, c) => acc + c.budget, 0), [campaigns]);
  const totalSpend = useMemo(() => campaigns.reduce((acc, c) => acc + c.spend, 0), [campaigns]);
  const totalLeads = useMemo(() => campaigns.reduce((acc, c) => acc + c.leads, 0), [campaigns]);
  const totalAdmissions = useMemo(() => campaigns.reduce((acc, c) => acc + c.admissions, 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((acc, c) => acc + c.revenue, 0), [campaigns]);

  const blendedCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const blendedCpa = totalAdmissions > 0 ? Math.round(totalSpend / totalAdmissions) : 0;
  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : "0";

  // Comparison Chart Data (Spend vs Revenue by Campaign)
  const comparisonData = useMemo(() => {
    return campaigns.map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + "..." : c.name,
      fullName: c.name,
      spend: c.spend,
      revenue: c.revenue,
      roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(1) : "0",
    }));
  }, [campaigns]);

  // Handle Export
  const handleExport = () => {
    try {
      const headers = ["Campaign", "Source", "Status", "Budget", "Spend", "Leads", "Cost_Per_Lead", "Admissions", "Cost_Per_Admission", "Revenue", "ROAS"];
      const rows = campaigns.map((c) => [
        `"${c.name.replace(/"/g, '""')}"`,
        c.source,
        c.status,
        c.budget,
        c.spend,
        c.leads,
        Math.round(c.spend / Math.max(c.leads, 1)),
        c.admissions,
        Math.round(c.spend / Math.max(c.admissions, 1)),
        c.revenue,
        c.spend > 0 ? (c.revenue / c.spend).toFixed(1) + "x" : "0x",
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encoded = encodeURI(csv);
      const a = document.createElement("a");
      a.href = encoded;
      a.download = `Campaign_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Campaign analytics CSV exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Header */}
      <PageHeader
        title="Campaign Analytics & Marketing Performance"
        subtitle="Full-funnel marketing attribution, cost per lead (CPL), student acquisition cost (CAC), and ROAS."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by Source"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Channels</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Website">Website</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>

            <PrimaryButton tone="ghost" onClick={handleExport}>
              <Download className="size-3.5 mr-1" />
              Export Data
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Financial Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label="Total Ad Spend" value={formatINR(totalSpend)} />
        <StatTile label="Leads Generated" value={totalLeads.toLocaleString()} />
        <StatTile label="Blended CPL" value={formatINR(blendedCpl)} />
        <StatTile label="Admissions Secured" value={totalAdmissions} tone="text-success" />
        <StatTile label="Cost / Admission (CAC)" value={formatINR(blendedCpa)} tone="text-primary" />
        <StatTile label="Overall ROAS" value={`${overallRoas}x`} tone="text-success" />
      </div>

      {/* Comparison Chart: Spend vs Revenue */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Campaign Spend vs Direct Revenue"
          description="Comparing marketing investments against tuition and consultancy fees"
          className="xl:col-span-2"
        >
          <ChartContainer
            config={{
              spend: { label: "Ad Spend", color: "var(--chart-5)" },
              revenue: { label: "Revenue", color: "var(--chart-3)" },
            }}
            className="h-[280px] w-full aspect-auto"
          >
            <BarChart data={comparisonData} margin={{ left: -10, right: 8, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${Math.round(val / 100000)}L`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="spend" fill="var(--chart-5)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="revenue" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <span>Ad Spend</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span>Attributed Revenue</span>
            </div>
          </div>
        </Panel>

        {/* Selected Campaign Spotlight */}
        {activeCampaign && (
          <Panel
            title={activeCampaign.name}
            description="Campaign deep-dive & conversion metrics"
            actions={
              <Link
                href={`/campaigns`}
                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Inspect <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Source / Platform:</span>
                <SourceBadge value={activeCampaign.source as any} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge value={activeCampaign.status} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Dates:</span>
                <span className="font-medium text-foreground">
                  {formatDate(activeCampaign.startDate)} – {formatDate(activeCampaign.endDate)}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spend to Budget:</span>
                  <span className="font-semibold text-foreground">
                    {formatINR(activeCampaign.spend)} / {formatINR(activeCampaign.budget)} (
                    {Math.round((activeCampaign.spend / activeCampaign.budget) * 100)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(Math.round((activeCampaign.spend / activeCampaign.budget) * 100), 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border p-2.5">
                  <span className="text-[11px] text-muted-foreground block">Cost / Lead</span>
                  <span className="text-base font-bold text-numeric text-foreground">
                    {formatINR(Math.round(activeCampaign.spend / Math.max(activeCampaign.leads, 1)))}
                  </span>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <span className="text-[11px] text-muted-foreground block">Cost / Admission</span>
                  <span className="text-base font-bold text-numeric text-primary">
                    {formatINR(Math.round(activeCampaign.spend / Math.max(activeCampaign.admissions, 1)))}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-success/30 bg-success/10 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Return on Ad Spend</span>
                  <span className="text-lg font-black text-numeric text-success">
                    {(activeCampaign.revenue / activeCampaign.spend).toFixed(1)}x ROAS
                  </span>
                </div>
                <span className="text-xs text-muted-foreground text-right">
                  Net: {formatINR(activeCampaign.revenue - activeCampaign.spend)}
                </span>
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* Full Campaign Matrix Table */}
      <Panel title="Complete Campaign Performance Matrix" description="Sortable breakdown of every active marketing initiative" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Campaign</th>
                <th className="px-4 py-2.5 text-left font-medium">Channel</th>
                <th className="px-4 py-2.5 text-right font-medium">Budget</th>
                <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                <th className="px-4 py-2.5 text-right font-medium">Cost / Lead</th>
                <th className="px-4 py-2.5 text-right font-medium">Applications</th>
                <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                <th className="px-4 py-2.5 text-right font-medium">Cost / Adm.</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => {
                const cpl = Math.round(c.spend / Math.max(c.leads, 1));
                const cpa = Math.round(c.spend / Math.max(c.admissions, 1));
                const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(1) : "0";
                const isSelected = activeCampaign?.id === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCampaignId(c.id)}
                    className={cn(
                      "hover:bg-accent/40 transition-colors cursor-pointer",
                      isSelected && "bg-primary/5 font-medium",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3">
                      <SourceBadge value={c.source as any} />
                    </td>
                    <td className="px-4 py-3 text-right text-numeric text-muted-foreground">{formatINR(c.budget)}</td>
                    <td className="px-4 py-3 text-right text-numeric font-medium">{formatINR(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-numeric">{c.leads}</td>
                    <td className="px-4 py-3 text-right text-numeric text-muted-foreground">{formatINR(cpl)}</td>
                    <td className="px-4 py-3 text-right text-numeric">{c.applications}</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-success">{c.admissions}</td>
                    <td className="px-4 py-3 text-right text-numeric font-medium text-primary">{formatINR(cpa)}</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-foreground">
                      {formatINR(c.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-numeric font-bold text-success">{roas}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* AI Campaign Optimization Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles className="size-4 shrink-0" />
            Top Performer: MBBS Kazakhstan
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Delivering an extraordinary 11.4x ROAS with ₹28.6L in confirmed admissions. Scaling budget by 20% is recommended.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            Budget Warning: Kyrgyzstan Push
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Campaign is currently paused with 98.8% budget utilized. Review lead follow-up queue before adding fresh ad spend.
          </p>
        </div>

        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <Target className="size-4 shrink-0" />
            Channel Diversification
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WhatsApp funnels achieve the lowest cost per lead (₹348). Reallocating unspent Google Ads funds could yield +28 leads.
          </p>
        </div>
      </div>
    </div>
  );
}
