import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SimpleTableProps {
  headers: ReactNode[];
  rows: ReactNode[][];
  className?: string;
  emptyText?: string;
}

export function SimpleTable({
  headers,
  rows,
  className,
  emptyText = "No records found.",
}: SimpleTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-8 text-center text-xs text-muted-foreground"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/40 transition">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3.5 align-middle text-xs text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function meta(title: string, description: string) {
  return [
    { title: `${title} — Lead.OS` },
    { name: "description", content: description },
  ];
}
