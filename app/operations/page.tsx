"use client";

import { useState, useSyncExternalStore, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, CloudUpload, Copy, FileWarning, Merge, FileSpreadsheet } from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { LeadTable } from "@/components/leads/lead-table";
import { ScoreBadge, SourceBadge } from "@/components/shared/badges";
import {
  bulkAssignLeads,
  createLead,
  formatDate,
  getDuplicates,
  getLeads,
  getTelecallers,
  resolveDuplicate,
  store,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { cn } from "@/lib/utils";

const IMPORT_STEPS = ["Upload CSV", "Map Columns", "Preview", "Validation", "Import"];

const MAPPING = [
  ["Full Name", "Student Name"],
  ["Mobile", "Phone"],
  ["Email", "Email"],
  ["Course", "Course"],
  ["Country", "Country"],
];

function ImportWizard() {
  const [step, setStep] = useState(0);
  const [csvRows, setCsvRows] = useState<string[][]>([
    ["Rohit Varma", "+91 98480 33144", "rohit.varma@gmail.com", "MBBS Abroad", "Kazakhstan"],
    ["Divya Teja", "+91 98765 22100", "divya.teja@gmail.com", "MBBS Abroad", "Georgia"],
    ["Sai Krishna", "+91 90000 66521", "sai.krishna@gmail.com", "Masters Abroad", "Germany"],
    ["Meghana Rao", "+91 94400 11288", "meghana.rao@gmail.com", "MBBS Abroad", "Uzbekistan"],
    ["Karthik Reddy", "+91 98490 77123", "karthik.r@gmail.com", "MBBS Abroad", "Russia"],
  ]);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length > 1) {
        const rows = lines.slice(1).map((line) => {
          return line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
        });
        setCsvRows(rows.slice(0, 50));
      }
      toast.success(`Loaded ${file.name} with ${lines.length - 1} rows`);
      setStep(1);
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    let count = 0;
    csvRows.forEach((r) => {
      const [name, phone, email, course, country] = r;
      if (name) {
        createLead({
          name,
          phone: phone || "+91 98480 00000",
          email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
          course: course || "MBBS Abroad",
          country: country || "Kazakhstan",
          source: "CSV Import",
          city: "Hyderabad",
          stage: "New",
          status: "New",
        });
        count++;
      }
    });

    setImportedCount(count);
    setStep(4);
    toast.success(`${count} leads imported into system`);
  };

  return (
    <Panel title="Bulk Lead Import" description="CSV file import with automated column mapping">
      <ol className="mb-5 flex flex-wrap gap-2">
        {IMPORT_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                i <= step ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("text-xs", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < IMPORT_STEPS.length - 1 && <span className="h-px w-5 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-2 px-6 py-12 text-center">
          <CloudUpload className="size-9 text-primary" />
          <p className="text-sm font-semibold text-foreground">Upload your lead data file (.CSV)</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Drag and drop or select your lead export file from Meta Ads, Google Sheets, or event intakes.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex gap-2 mt-2">
            <PrimaryButton tone="brand" onClick={() => fileInputRef.current?.click()}>
              Choose CSV File
            </PrimaryButton>
            <PrimaryButton tone="ghost" onClick={() => setStep(1)}>
              Use Sample Data ({csvRows.length} rows)
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Confirm how your CSV headers match Lead.OS lead fields:</p>
          <div className="space-y-2">
            {MAPPING.map(([csv, field]) => (
              <div key={csv} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-border px-3 py-2 bg-card">
                <span className="text-sm font-mono text-muted-foreground">{csv}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-semibold text-primary">{field}</span>
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-3" onClick={() => setStep(2)}>
            Continue to Preview
          </PrimaryButton>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Student Name", "Phone", "Email", "Course", "Country"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {csvRows.slice(0, 5).map((r, idx) => (
                  <tr key={idx}>
                    {r.map((c, i) => (
                      <td key={i} className="px-3 py-2 text-xs font-medium">
                        {c || <span className="text-destructive font-bold">missing</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Showing {Math.min(5, csvRows.length)} of {csvRows.length} rows</p>
          <PrimaryButton onClick={() => setStep(3)}>Run Data Validation</PrimaryButton>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Ready to Import" value={csvRows.length} tone="text-success" />
            <StatTile label="Duplicates Detected" value={0} tone="text-warning" />
            <StatTile label="Invalid Rows" value={0} tone="text-muted-foreground" />
          </div>
          <PrimaryButton tone="brand" onClick={executeImport}>
            Confirm & Import {csvRows.length} Leads into System
          </PrimaryButton>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-5">
          <CheckCircle2 className="size-7 text-success" />
          <p className="text-lg font-bold text-foreground">{importedCount} Leads Successfully Imported!</p>
          <p className="text-sm text-muted-foreground">
            Leads have been injected into the pipeline with source "CSV Import" and assigned to New queue.
          </p>
          <div className="flex gap-2 pt-2">
            <Link
              href="/leads"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              View in Leads Roster
            </Link>
            <PrimaryButton tone="ghost" onClick={() => setStep(0)}>
              Import Another File
            </PrimaryButton>
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function OperationsPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();

  const leads = getLeads(branch);
  const unassigned = leads.filter((l) => !l.assignedTo);
  const duplicates = getDuplicates();
  const telecallers = getTelecallers(branch);
  const [tab, setTab] = useState<"queue" | "import" | "duplicates">("queue");

  const handleResolveDuplicate = (id: string, action: "merge" | "keep" | "ignore") => {
    resolveDuplicate(id, action);
    if (action === "merge") {
      toast.success("Leads merged successfully into single profile");
    } else if (action === "keep") {
      toast.success("Kept as independent lead records");
    } else {
      toast("Duplicate flag ignored");
    }
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Lead Operations`}
        subtitle={`Import, de-duplicate, score and assign ${branch === "masters" ? "Masters" : "MBBS"} leads at scale.`}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Unassigned in Queue" value={unassigned.length} tone="text-brand" />
        <StatTile label="Possible Duplicates" value={duplicates.length} tone={duplicates.length > 0 ? "text-warning" : "text-muted-foreground"} />
        <StatTile label="High Intent (Score 70+)" value={leads.filter((l) => l.score >= 70).length} tone="text-success" />
        <StatTile label="Total Active Workspace" value={leads.length} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["queue", `Assignment queue (${unassigned.length})`],
            ["import", "Bulk import"],
            ["duplicates", `Duplicate detection (${duplicates.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition cursor-pointer font-medium",
              tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-4">
          <Panel
            title="Unassigned queue"
            description="Assign in bulk using a rule or pick a telecaller"
            actions={
              <select
                aria-label="Bulk assign unassigned leads"
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground cursor-pointer outline-none focus:border-primary"
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const count = bulkAssignLeads(unassigned.map((l) => l.id), e.target.value);
                  toast.success(`${count} leads assigned`);
                }}
              >
                <option value="">Bulk assign all…</option>
                {telecallers.length === 0 && <option value="" disabled>No team members available</option>}
                {telecallers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.team})
                  </option>
                ))}
              </select>
            }
            bodyClassName="p-0"
          >
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {unassigned.length === 0 ? (
                <li className="px-5 py-6 text-center text-xs text-muted-foreground">
                  No unassigned leads in queue. All leads are currently assigned!
                </li>
              ) : (
                unassigned.slice(0, 20).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition">
                    <div>
                      <Link
                        href={`/leads/${l.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {l.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {l.id} · {l.city} · {formatDate(l.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SourceBadge value={l.source} />
                      <ScoreBadge score={l.score} showBand={false} />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Panel>
          <LeadTable leads={leads} />
        </div>
      )}

      {tab === "import" && <ImportWizard />}

      {tab === "duplicates" && (
        <div className="space-y-4">
          {duplicates.length === 0 ? (
            <Panel>
              <div className="p-8 text-center text-sm text-muted-foreground">
                No potential duplicates found. Clean database!
              </div>
            </Panel>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {duplicates.map((d) => (
                <Panel key={d.id} title={`Possible duplicate · ${d.confidence}% match`} description={`Matched on ${d.matchOn}`}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-surface-2 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Existing lead</p>
                      <Link href={`/leads/${d.existing.id}`} className="mt-1 text-sm font-semibold text-foreground hover:text-primary hover:underline block">
                        {d.existing.name}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{d.existing.id}</p>
                      <p className="mt-1 text-xs text-foreground">{d.existing.phone}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(d.existing.createdAt)}</p>
                    </div>
                    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Incoming lead</p>
                      <Link href={`/leads/${d.incoming.id}`} className="mt-1 text-sm font-semibold text-foreground hover:text-primary hover:underline block">
                        {d.incoming.name}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{d.incoming.id}</p>
                      <p className="mt-1 text-xs text-foreground">{d.incoming.phone}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(d.incoming.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PrimaryButton tone="brand" onClick={() => handleResolveDuplicate(d.id, "merge")}>
                      <Merge className="size-4" /> Merge
                    </PrimaryButton>
                    <PrimaryButton tone="ghost" onClick={() => handleResolveDuplicate(d.id, "keep")}>
                      <Copy className="size-4" /> Keep Separate
                    </PrimaryButton>
                    <PrimaryButton tone="ghost" onClick={() => handleResolveDuplicate(d.id, "ignore")}>
                      <FileWarning className="size-4" /> Ignore
                    </PrimaryButton>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
