"use client";

import { useId, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Calculator,
  Sparkles,
  ArrowUpRight,
  PieChart as PieChartIcon,
  ShieldCheck,
  Globe,
  Sliders,
  Download,
  CheckCircle2,
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
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { SourceBadge } from "@/components/shared/badges";
import { formatINR, getAdmissions, getCampaigns, getLeads, getSources } from "@/services/api";
import { cn } from "@/lib/utils";

export default function RoiAnalysisPage() {
  const [simulationSpend, setSimulationSpend] = useState<number>(100000);
  const [selectedChannel, setSelectedChannel] = useState<string>("Meta Ads");

  const campaigns = getCampaigns();
  const sources = getSources();
  const leads = getLeads();
  const admissions = getAdmissions();

  // Financial aggregates
  const totalSpend = useMemo(() => campaigns.reduce((acc, c) => acc + c.spend, 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((acc, c) => acc + c.revenue, 0), [campaigns]);
  const totalAdmissions = admissions.length;
  const netContribution = totalRevenue - totalSpend;

  const blendedCac = totalAdmissions > 0 ? Math.round(totalSpend / totalAdmissions) : 0;
  const avgLtv = totalAdmissions > 0 ? Math.round(totalRevenue / totalAdmissions) : 0;
  const ltvCacRatio = blendedCac > 0 ? (avgLtv / blendedCac).toFixed(1) : "0";
  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : "0";

  // Channel Profitability
  const channelRoi = useMemo(() => {
    return [
      { channel: "Meta Ads", spend: 428000, admissions: 14, revenue: 3520000 },
      { channel: "Google Ads", spend: 392000, admissions: 14, revenue: 3280000 },
      { channel: "Website", spend: 74000, admissions: 7, revenue: 1540000 },
      { channel: "WhatsApp", spend: 46000, admissions: 5, revenue: 1100000 },
    ].map((item) => {
      const net = item.revenue - item.spend;
      const roas = item.spend > 0 ? (item.revenue / item.spend).toFixed(1) : "0";
      const cac = item.admissions > 0 ? Math.round(item.spend / item.admissions) : 0;
      return {
        ...item,
        net,
        roas,
        cac,
      };
    });
  }, []);

  // Country & Destination Profitability
  const countryProfitability = useMemo(() => [
    { country: "Kazakhstan", avgFee: 320000, commissionRate: 80, cac: 22700, margin: 76.5, admissions: 16 },
    { country: "Georgia", avgFee: 350000, commissionRate: 85, cac: 26000, margin: 74.2, admissions: 12 },
    { country: "Germany", avgFee: 260000, commissionRate: 75, cac: 30600, margin: 71.0, admissions: 8 },
    { country: "Kyrgyzstan", avgFee: 280000, commissionRate: 80, cac: 24500, margin: 73.8, admissions: 6 },
    { country: "Uzbekistan", avgFee: 300000, commissionRate: 80, cac: 21800, margin: 77.2, admissions: 4 },
  ], []);

  // Live Scenario Simulator
  const simResults = useMemo(() => {
    // Channel unit metrics
    const metrics: Record<string, { cpl: number; leadToAdmRate: number; avgRevPerAdm: number }> = {
      "Meta Ads": { cpl: 780, leadToAdmRate: 0.034, avgRevPerAdm: 260000 },
      "Google Ads": { cpl: 850, leadToAdmRate: 0.033, avgRevPerAdm: 245000 },
      "Website": { cpl: 450, leadToAdmRate: 0.043, avgRevPerAdm: 220000 },
      "WhatsApp": { cpl: 350, leadToAdmRate: 0.038, avgRevPerAdm: 220000 },
    };
    const sel = metrics[selectedChannel] || metrics["Meta Ads"];
    const projLeads = Math.round(simulationSpend / sel.cpl);
    const projAdmissions = Number((projLeads * sel.leadToAdmRate).toFixed(1));
    const projRevenue = Math.round(projAdmissions * sel.avgRevPerAdm);
    const projProfit = projRevenue - simulationSpend;
    const projRoas = simulationSpend > 0 ? (projRevenue / simulationSpend).toFixed(1) : "0";

    return {
      projLeads,
      projAdmissions,
      projRevenue,
      projProfit,
      projRoas,
    };
  }, [simulationSpend, selectedChannel]);

  // Export Financial CSV
  const handleExport = () => {
    try {
      const headers = ["Channel", "Ad_Spend", "Admissions", "Revenue", "Net_Profit", "CAC", "ROAS"];
      const rows = channelRoi.map((c) => [
        c.channel,
        c.spend,
        c.admissions,
        c.revenue,
        c.net,
        c.cac,
        c.roas + "x",
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encoded = encodeURI(csv);
      const a = document.createElement("a");
      a.href = encoded;
      a.download = `ROI_Financial_Analysis_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("ROI Financial analysis exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Header */}
      <PageHeader
        title="ROI & Unit Economics Analysis"
        subtitle="Customer acquisition cost (CAC), student lifetime value (LTV), margin by study destination, and payback velocity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton tone="ghost" onClick={handleExport}>
              <Download className="size-3.5 mr-1" />
              Export Financials
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Financial Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label="Gross Realized Revenue" value={formatINR(totalRevenue)} tone="text-success" />
        <StatTile label="Total Marketing Spend" value={formatINR(totalSpend)} />
        <StatTile label="Net Contribution Margin" value={formatINR(netContribution)} tone="text-foreground" />
        <StatTile label="Blended CAC" value={formatINR(blendedCac)} tone="text-primary" />
        <StatTile label="LTV : CAC Ratio" value={`${ltvCacRatio} : 1`} tone="text-emerald-600" />
        <StatTile label="Overall ROAS Multiple" value={`${overallRoas}x`} tone="text-success" />
      </div>

      {/* Interactive Scenario Simulator */}
      <Panel
        title="Predictive Budget Allocation & ROI Scenario Modeler"
        description="Forecast admissions yield and revenue output from targeted ad budget adjustments"
        className="border-primary/30 bg-primary/5"
      >
        <div className="grid gap-6 lg:grid-cols-3 items-center">
          <div className="space-y-4 lg:col-span-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Select Acquisition Channel:</span>
                <span className="font-medium text-primary">{selectedChannel}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Meta Ads", "Google Ads", "Website", "WhatsApp"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer text-center",
                      selectedChannel === ch
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-foreground hover:bg-surface-2",
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Incremental Budget Allocation:</span>
                <span className="font-bold text-primary text-numeric text-sm">{formatINR(simulationSpend)}</span>
              </div>
              <input
                type="range"
                min={25000}
                max={500000}
                step={25000}
                value={simulationSpend}
                onChange={(e) => setSimulationSpend(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>₹25,000</span>
                <span>₹2,50,000</span>
                <span>₹5,00,000</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Projected New Leads</span>
              <span className="text-2xl font-bold text-numeric text-foreground">+{simResults.projLeads}</span>
              <span className="text-[11px] text-muted-foreground block">based on historical CPL</span>
            </div>

            <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Projected Admissions</span>
              <span className="text-2xl font-bold text-numeric text-emerald-600">+{simResults.projAdmissions}</span>
              <span className="text-[11px] text-muted-foreground block">students enrolled</span>
            </div>

            <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Gross Expected Revenue</span>
              <span className="text-2xl font-bold text-numeric text-foreground">{formatINR(simResults.projRevenue)}</span>
              <span className="text-[11px] text-muted-foreground block">direct commission fees</span>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Projected Net ROI / ROAS</span>
              <span className="text-2xl font-bold text-numeric text-emerald-600">{simResults.projRoas}x ROAS</span>
              <span className="text-[11px] text-muted-foreground block">
                Net Profit: +{formatINR(simResults.projProfit)}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Middle Grid: Channel ROI Chart & Table */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Channel Net Contribution"
          description="Gross revenue generated vs direct marketing expenditure"
        >
          <ChartContainer
            config={{
              revenue: { label: "Revenue", color: "var(--chart-3)" },
              spend: { label: "Ad Spend", color: "var(--chart-5)" },
            }}
            className="h-[260px] w-full aspect-auto"
          >
            <BarChart data={channelRoi} margin={{ left: -10, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="channel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `₹${Math.round(val / 100000)}L`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="spend" fill="var(--chart-5)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground border-t border-border pt-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-600" />
              <span>Realized Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <span>Marketing Spend</span>
            </div>
          </div>
        </Panel>

        <Panel title="Channel Financial Breakdown" description="Direct ROI and CAC per channel" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Channel</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                  <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                  <th className="px-4 py-2.5 text-right font-medium">CAC</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {channelRoi.map((c) => (
                  <tr key={c.channel} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <SourceBadge value={c.channel as any} />
                    </td>
                    <td className="px-4 py-3 text-right text-numeric text-muted-foreground">{formatINR(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-numeric font-medium text-foreground">{c.admissions}</td>
                    <td className="px-4 py-3 text-right text-numeric text-primary font-medium">{formatINR(c.cac)}</td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-foreground">
                      {formatINR(c.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-numeric font-bold text-success">{c.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Destination Country Profitability Matrix */}
      <Panel
        title="Destination Country Unit Economics & Profit Margins"
        description="Average student fee, consultancy commission, and net margin percentage"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Study Destination</th>
                <th className="px-4 py-2.5 text-right font-medium">Admissions</th>
                <th className="px-4 py-2.5 text-right font-medium">Avg Fee / Student</th>
                <th className="px-4 py-2.5 text-right font-medium">Acquisition Cost (CAC)</th>
                <th className="px-4 py-2.5 text-right font-medium">Net Contribution Margin %</th>
                <th className="px-4 py-2.5 text-right font-medium">Total Pipeline Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {countryProfitability.map((item) => {
                const totalRev = item.admissions * item.avgFee;
                return (
                  <tr key={item.country} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                      <Globe className="size-4 text-muted-foreground" />
                      {item.country}
                    </td>
                    <td className="px-4 py-3 text-right text-numeric font-semibold text-success">{item.admissions}</td>
                    <td className="px-4 py-3 text-right text-numeric text-muted-foreground">{formatINR(item.avgFee)}</td>
                    <td className="px-4 py-3 text-right text-numeric font-medium text-primary">{formatINR(item.cac)}</td>
                    <td className="px-4 py-3 text-right text-numeric font-bold text-emerald-600">
                      {item.margin}%
                    </td>
                    <td className="px-4 py-3 text-right text-numeric font-bold text-foreground">
                      {formatINR(totalRev)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Executive Financial Health Observations */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            Healthy LTV:CAC Ratio (9.3:1)
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Unit economics indicate outstanding marketing efficiency, well above the enterprise SaaS/education benchmark of 3:1.
          </p>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="size-4 shrink-0" />
            Top Margin Destination: Kazakhstan
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kazakhstan delivers 76.5% net margin contribution and the fastest payback window (18 days from enquiry to deposit).
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Percent className="size-4 shrink-0 text-muted-foreground" />
            Organic Referral Expansion
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WhatsApp and Website channels generate ₹26.4L at zero ad spend, buffering blended CAC down to ₹20,400.
          </p>
        </div>
      </div>
    </div>
  );
}
