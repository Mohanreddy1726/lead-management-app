"use client";

import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  label: string;
  done: number;
  target: number;
  className?: string;
}

export function ProgressBar({ label, done, target, className }: ProgressBarProps) {
  const percentage = Math.min(Math.round((done / Math.max(target, 1)) * 100), 100);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-numeric text-muted-foreground">{percentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-border">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            percentage >= 90
              ? "bg-destructive"
              : percentage >= 75
              ? "bg-warning"
              : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface BarRowProps {
  label: string;
  value: number;
  max: number;
  sub?: string;
  className?: string;
}

export function BarRow({ label, value, max, sub, className }: BarRowProps) {
  const percentage = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{label}</span>
          {sub && <span className="text-[11px] text-muted-foreground">· {sub}</span>}
        </div>
        <span className="text-numeric font-semibold text-foreground">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2 border border-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface FunnelStage {
  stage: string;
  value: number;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  className?: string;
}

export function FunnelChart({ stages, className }: FunnelChartProps) {
  const maxVal = Math.max(...stages.map((s) => s.value), 1);
  const topVal = stages[0]?.value || 1;

  const stageColors = [
    "bg-indigo-600 dark:bg-indigo-500",
    "bg-blue-600 dark:bg-blue-500",
    "bg-sky-600 dark:bg-sky-500",
    "bg-teal-600 dark:bg-teal-500",
    "bg-emerald-600 dark:bg-emerald-500",
  ];

  return (
    <div className={cn("space-y-3 py-1", className)}>
      {stages.map((item, index) => {
        const pctOfMax = Math.max(Math.round((item.value / maxVal) * 100), 12);
        const pctOfTop = Math.round((item.value / topVal) * 100);
        const prevValue = index > 0 ? stages[index - 1].value : null;
        const stepRate = prevValue ? Math.round((item.value / Math.max(prevValue, 1)) * 100) : null;
        const color = stageColors[index % stageColors.length];

        return (
          <div key={item.stage} className="group relative">
            <div className="mb-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted-foreground border border-border">
                  {index + 1}
                </span>
                <span className="font-medium text-foreground">{item.stage}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-foreground text-numeric">
                  {item.value.toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({pctOfTop}% of total{stepRate !== null ? ` · ${stepRate}% conv.` : ""})
                </span>
              </div>
            </div>

            <div className="h-9 w-full rounded-lg bg-surface-2/60 border border-border/60 p-1 flex items-center">
              <div
                className={cn(
                  "h-full rounded-md transition-all duration-500 flex items-center justify-between px-3 text-xs font-medium text-white shadow-xs",
                  color
                )}
                style={{ width: `${pctOfMax}%` }}
              >
                <span className="truncate">{item.stage}</span>
                <span className="text-numeric font-semibold ml-2">{pctOfTop}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
