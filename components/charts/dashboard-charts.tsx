"use client";

import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/page";
import type { Lead, Telecaller } from "@/data/types";

const sourceColors = ["var(--chart-1)","var(--chart-5)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-6)"];

export function LeadTrend({ leads }: { leads: Lead[] }) {
  const [days, setDays] = useState(30);
  const gradientId = `lead-trend-${useId().replace(/:/g, "")}`;
  const latest = Math.max(...leads.map((lead) => new Date(lead.createdAt).getTime()), 0);
  const end = new Date(latest);
  end.setUTCHours(0, 0, 0, 0);
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(end.getTime() - (days - index - 1) * 86400000);
    const day = date.toISOString().slice(0, 10);
    return { date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), leads: leads.filter((lead) => lead.createdAt.slice(0, 10) === day).length };
  });
  const total = points.reduce((sum, point) => sum + point.leads, 0);
  return (
    <Panel title="Lead acquisition" description={`Sample lead records · ${points[0]?.date} – ${points.at(-1)?.date}`}
      actions={
        <div className="flex gap-1 rounded-md bg-muted p-1">
          {[7, 30].map((period) => (
            <Button key={period} size="sm" variant={days === period ? "outline" : "ghost"} onClick={() => setDays(period)}>{period} days</Button>
          ))}
        </div>
      }
    >
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-numeric text-3xl font-semibold">{total}</span>
        <span className="text-xs text-muted-foreground">leads captured</span>
      </div>
      <ChartContainer config={{ leads: { label: "New leads", color: "var(--chart-1)" } }} className="h-[235px] w-full aspect-auto">
        <AreaChart data={points} margin={{ left: -24, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickMargin={12} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area dataKey="leads" type="monotone" fill={`url(#${gradientId})`} stroke="var(--chart-1)" strokeWidth={2.5} isAnimationActive={false} />
        </AreaChart>
      </ChartContainer>
    </Panel>
  );
}

export function SourceDonut({ sources, onSelect }: { sources: { name: string; leads: number }[]; onSelect: (source: string) => void }) {
  const total = sources.reduce((sum, source) => sum + source.leads, 0);
  const data = sources.map((source, index) => ({ ...source, fill: sourceColors[index % sourceColors.length] }));
  return (
    <Panel title="Source distribution" description="Lead records by acquisition channel">
      <div className="relative mx-auto w-full max-w-[280px]">
        <ChartContainer config={{ leads: { label: "Leads" } }} className="h-[210px] w-full aspect-auto">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie data={data} dataKey="leads" nameKey="name" innerRadius={72} outerRadius={96} paddingAngle={3} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {data.map((source) => <Cell key={source.name} fill={source.fill} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-numeric text-3xl font-semibold">{total}</span>
          <span className="mt-1 text-xs text-muted-foreground">sample leads</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {data.map((source, index) => (
          <Button key={source.name} variant="ghost" onClick={() => onSelect(source.name)} className="h-auto justify-between gap-2 px-1 py-2 text-xs">
            <span className="flex items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full dashboard-source-${index}`} />
              {source.name}
            </span>
            <span className="text-numeric text-muted-foreground">{Math.round(source.leads / Math.max(total, 1) * 100)}%</span>
          </Button>
        ))}
      </div>
    </Panel>
  );
}

export function PipelineChart({ stages, onSelect }: { stages: { stage: string; value: number }[]; onSelect: (stage: string) => void }) {
  return (
    <ChartContainer config={{ value: { label: "Leads", color: "var(--chart-1)" } }} className="h-[320px] w-full aspect-auto">
      <BarChart layout="vertical" data={stages} margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
        <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis dataKey="stage" type="category" width={104} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={17} minPointSize={4} isAnimationActive={false} className="cursor-pointer"
          onClick={(entry: any) => { if (typeof entry?.stage === "string") onSelect(entry.stage); }}>
          {stages.map((stage, index) => (
            <Cell key={stage.stage} fill={index >= 7 ? "var(--chart-3)" : index >= 4 ? "var(--chart-6)" : "var(--chart-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function TeamChart({ team }: { team: Telecaller[] }) {
  const [metric, setMetric] = useState<"callsToday" | "admissions">("callsToday");
  const data = team.map((member) => ({ name: member.name.split(" ")[0], value: member[metric] }));
  return (
    <Panel title="Team performance"
      description={metric === "callsToday" ? "Calls placed today · sample activity" : "Admissions secured · sample totals"}
      actions={
        <div className="flex gap-1 rounded-md bg-muted p-1">
          <Button size="sm" variant={metric === "callsToday" ? "outline" : "ghost"} onClick={() => setMetric("callsToday")}>Calls</Button>
          <Button size="sm" variant={metric === "admissions" ? "outline" : "ghost"} onClick={() => setMetric("admissions")}>Admissions</Button>
        </div>
      }
    >
      <ChartContainer config={{ value: { label: metric === "callsToday" ? "Calls" : "Admissions", color: "var(--chart-3)" } }} className="h-[265px] w-full aspect-auto">
        <BarChart data={data} margin={{ left: -24, right: 0, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={12} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      <div className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-success" />
        {team.filter((member) => member.presence === "Active").length} active telecallers
        <span className="ml-auto text-numeric font-medium text-foreground">
          {team.reduce((sum, member) => sum + member[metric], 0)} {metric === "callsToday" ? "calls" : "admissions"}
        </span>
      </div>
    </Panel>
  );
}
