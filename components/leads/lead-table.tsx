"use client";

import { useMemo, useState, useSyncExternalStore, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  Columns3,
  Download,
  Filter as FilterIcon,
  MoreHorizontal,
  Search,
  Star,
  Plus,
  Trash2,
  Tag as TagIcon,
  FileText,
  RefreshCw,
  UserCheck,
} from "lucide-react";

import { SourceBadge, StageBadge, StatusBadge } from "@/components/shared/badges";
import { PrimaryButton } from "@/components/modals/modal";
import { EmptyState } from "@/components/shared/page";
import { COUNTRIES, COURSES, SOURCES, STAGES, STATUSES } from "@/data/mock";
import {
  bulkAssignLeads,
  bulkUpdateLeads,
  bulkDeleteLeads,
  addTimelineEvent,
  formatDate,
  getSavedViews,
  getTelecallers,
  getLeads,
  store,
  syncLeadsFromDb,
} from "@/services/api";

import { AddLeadModal } from "@/components/modals/add-lead-modal";
import { AssignLeadsModal } from "@/components/modals/assign-leads-modal";
import { useBranch } from "@/context/BranchContext";
import type { Lead } from "@/data/types";
import { cn } from "@/lib/utils";

const ALL_COLUMNS = [
  "Lead ID",
  "Date",
  "Student",
  "Phone",
  "Email",
  "Source",
  "Data",
  "Course",
  "Country",
  "Assigned To",
  "Stage",
  "Status",
  "Next Follow-up",
] as const;

export function LeadTable({
  leads: propLeads,
  initialStage,
  initialSearch,
  initialView,
  openNewModal,
  compact,
}: {
  leads?: Lead[];
  initialStage?: string;
  initialSearch?: string;
  initialView?: string;
  openNewModal?: boolean;
  compact?: boolean;
}) {
  // Sync with store updates
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const allBranchLeads = getLeads(branch);
  const leads = propLeads ? propLeads.filter((l) => !branch || l.branch === branch) : allBranchLeads;

  const telecallers = getTelecallers(branch);
  const savedViews = getSavedViews();

  const [query, setQuery] = useState(initialSearch ?? "");
  const [stage, setStage] = useState(initialStage ?? "");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [course, setCourse] = useState("");
  const [country, setCountry] = useState("");
  const [owner, setOwner] = useState(
    initialView === "assigned"
      ? "all-assigned"
      : initialView === "unassigned"
        ? "none"
        : ""
  );
  const [sort, setSort] = useState<{ key: keyof Lead; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>(compact ? ["Email", "Country"] : ["Email"]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncLeadsFromDb(true);
      toast.success("Synced latest leads from website database");
    } catch {
      toast.error("Failed to sync leads");
    } finally {
      setIsSyncing(false);
    }
  };

  const [showColumns, setShowColumns] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(openNewModal ?? false);
  const [assignLeadsOpen, setAssignLeadsOpen] = useState(false);

  // Sync props changes if navigation changes query
  useEffect(() => {
    if (initialSearch !== undefined) setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (initialView === "assigned") setOwner("all-assigned");
    else if (initialView === "unassigned") setOwner("none");
  }, [initialView]);

  useEffect(() => {
    if (initialStage !== undefined) setStage(initialStage);
  }, [initialStage]);

  useEffect(() => {
    if (openNewModal) setAddLeadOpen(true);
  }, [openNewModal]);

  const pageSize = 12;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = leads.filter((l) => {
      if (q && ![l.name, l.id, l.phone, l.email, l.city, l.course, l.country].some((v) => (v || "").toLowerCase().includes(q)))
        return false;
      if (stage && l.stage !== stage) return false;
      if (status && l.status !== status) return false;
      if (source && l.source !== source) return false;
      if (course && l.course !== course) return false;
      if (country && l.country !== country) return false;
      if (owner === "all-assigned" && !l.assignedTo) return false;
      if (owner === "none" && l.assignedTo) return false;
      if (owner && owner !== "none" && owner !== "all-assigned" && l.assignedTo !== owner) return false;
      return true;
    });
    return out.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      return av > bv ? sort.dir : av < bv ? -sort.dir : 0;
    });
  }, [leads, query, stage, status, source, course, country, owner, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);
  const visible = (c: string) => !hidden.includes(c);
  const allChecked = current.length > 0 && current.every((l) => selected.includes(l.id));

  const resetFilters = () => {
    setStage("");
    setStatus("");
    setSource("");
    setCourse("");
    setCountry("");
    setOwner("");
    setQuery("");
    setPage(1);
  };

  const handleBulkAddTag = () => {
    const tag = window.prompt("Enter tag to add to selected leads:", "Priority NEET");
    if (!tag || !tag.trim()) return;
    selected.forEach((id) => {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        const nextTags = Array.from(new Set([...lead.tags, tag.trim()]));
        bulkUpdateLeads([id], { tags: nextTags });
      }
    });
    toast.success(`Tag "${tag.trim()}" added to ${selected.length} leads`);
    setSelected([]);
  };

  const handleBulkAddNote = () => {
    const note = window.prompt("Enter note to add to selected leads' timelines:");
    if (!note || !note.trim()) return;
    selected.forEach((id) => {
      addTimelineEvent(id, {
        type: "note",
        title: "Bulk Note Added",
        detail: note.trim(),
        actor: "Batch Action",
      });
    });
    toast.success(`Note added to ${selected.length} leads`);
    setSelected([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selected.length} leads? This action cannot be undone.`)) {
      const count = bulkDeleteLeads(selected);
      toast.success(`${count} leads deleted successfully`);
      setSelected([]);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        "Lead ID",
        "Date",
        "Student",
        "Phone",
        "Email",
        "City",
        "Source",
        "Form / Tool Data",
        "NEET Score",
        "Budget",
        "Course",
        "Country",
        "Stage",
        "Status",
        "Assigned To",
      ];
      const rows = filtered.map((l) => [
        l.id,
        formatDate(l.createdAt),
        `"${l.name}"`,
        `"${l.phone}"`,
        `"${l.email}"`,
        `"${l.city}"`,
        `"${l.source}"`,
        `"${l.attribution?.formId || l.tags[0] || ""}"`,
        l.neetScore ?? "",
        `"${l.budget || ""}"`,
        `"${l.course}"`,
        `"${l.country}"`,
        l.stage,
        l.status,
        `"${telecallers.find((t) => t.id === l.assignedTo)?.name || "Yet to Assign"}"`,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encoded = encodeURI(csv);
      const a = document.createElement("a");
      a.href = encoded;
      a.download = `Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Exported ${filtered.length} leads to CSV`);
    } catch {
      toast.error("Export failed");
    }
  };

  const selectClass =
    "h-9 rounded-lg border border-border bg-surface-2 px-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, lead ID, phone, city, course…"
            aria-label="Search leads"
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
          />
        </div>

        <PrimaryButton
          tone="brand"
          onClick={() => setAssignLeadsOpen(true)}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
        >
          <UserCheck className="size-4" /> Assign Leads
        </PrimaryButton>

        <PrimaryButton tone="ghost" onClick={() => setShowFilters((f) => !f)}>
          <FilterIcon className="size-4" /> Filters
        </PrimaryButton>

        <div className="relative">
          <PrimaryButton tone="ghost" onClick={() => setShowColumns((c) => !c)}>
            <Columns3 className="size-4" /> Columns
          </PrimaryButton>
          {showColumns && (
            <div className="absolute right-0 top-11 z-40 w-52 rounded-xl border border-slate-300 bg-white p-2 shadow-xl">
              {ALL_COLUMNS.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={visible(c)}
                    onChange={() => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]))}
                    className="size-3.5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  {c}
                </label>
              ))}
            </div>
          )}
        </div>

        <PrimaryButton tone="ghost" onClick={handleExportCSV}>
          <Download className="size-4" /> Export
        </PrimaryButton>

        <PrimaryButton tone="ghost" onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={cn("size-4", isSyncing && "animate-spin text-indigo-600")} /> {isSyncing ? "Syncing…" : "Refresh"}
        </PrimaryButton>
      </div>

      {/* ── Saved Views ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-700">Saved views:</span>
        {savedViews.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              resetFilters();
              if (v.filters.assigned === "none") setOwner("none");
              if (v.filters.assigned && v.filters.assigned !== "none") setOwner(v.filters.assigned);
              if (v.filters.status) setStatus(v.filters.status);
              if (v.filters.source) setSource(v.filters.source);
              if (v.filters.country) setCountry(v.filters.country);
              toast.success(`Applied view — ${v.name}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs cursor-pointer"
          >
            <Star className="size-3 text-amber-500 fill-amber-500" />
            {v.name}
          </button>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-slate-100/90 p-3 shadow-2xs">
          <select className={selectClass} value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">All courses</option>
            {COURSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All countries</option>
            {COUNTRIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">All telecallers</option>
            <option value="all-assigned">Any Assigned</option>
            <option value="none">Yet to Assign</option>
            {telecallers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <PrimaryButton tone="ghost" onClick={resetFilters}>
            Clear
          </PrimaryButton>
        </div>
      )}

      {/* ── Bulk Actions Bar ── */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/90 px-3 py-2 shadow-2xs">
          <span className="text-sm font-bold text-indigo-950">{selected.length} selected</span>
          <select
            className={selectClass}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              bulkAssignLeads(selected, e.target.value);
              toast.success(`${selected.length} leads assigned`);
              setSelected([]);
            }}
          >
            <option value="">Assign / Reassign…</option>
            {telecallers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              bulkUpdateLeads(selected, { stage: e.target.value as Lead["stage"] });
              toast.success("Stage updated for selected leads");
              setSelected([]);
            }}
          >
            <option value="">Change stage…</option>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <PrimaryButton tone="ghost" onClick={handleBulkAddTag}>
            <TagIcon className="size-3.5 mr-1" /> Add Tag
          </PrimaryButton>
          <PrimaryButton tone="ghost" onClick={handleBulkAddNote}>
            <FileText className="size-3.5 mr-1" /> Add Note
          </PrimaryButton>
          <PrimaryButton tone="ghost" onClick={handleExportCSV}>
            <Download className="size-3.5 mr-1" /> Export
          </PrimaryButton>
          <PrimaryButton tone="danger" onClick={handleBulkDelete}>
            <Trash2 className="size-3.5 mr-1" /> Delete
          </PrimaryButton>
        </div>
      )}

      {/* ── Table Container ── */}
      <div className="panel overflow-hidden">
        {current.length === 0 ? (
          <EmptyState
            title="No leads match these filters"
            description="Try clearing a filter or widening your search to see leads again."
            action={
              <div className="flex gap-2">
                <PrimaryButton tone="ghost" onClick={resetFilters}>
                  Clear filters
                </PrimaryButton>
                <PrimaryButton tone="brand" onClick={() => setAssignLeadsOpen(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  <UserCheck className="size-4" /> Assign Leads
                </PrimaryButton>
              </div>
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-100/90 border-y border-slate-300 text-xs uppercase tracking-wider text-slate-700 font-bold">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        className="size-4 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={allChecked}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? Array.from(new Set([...selected, ...current.map((l) => l.id)]))
                              : selected.filter((id) => !current.some((l) => l.id === id)),
                          )
                        }
                      />
                    </th>
                    {ALL_COLUMNS.filter(visible).map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-3 text-left font-bold text-slate-700">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 cursor-pointer transition"
                          onClick={() => {
                            const map: Record<string, keyof Lead> = {
                              "Lead ID": "id",
                              Date: "createdAt",
                              Student: "name",
                              Phone: "phone",
                              Stage: "stage",
                              Status: "status",
                              Course: "course",
                              Country: "country",
                              Source: "source",
                            };
                            const key = map[c];
                            if (key) setSort((s) => ({ key, dir: s.key === key && s.dir === 1 ? -1 : 1 }));
                          }}
                        >
                          {c}
                          <ChevronDown className="size-3.5 opacity-70" />
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {current.map((l) => {
                    const isGoogle = l.source === "Google Ads";
                    const isWebsite = l.source === "Website";
                    const isMeta = l.source === "Meta Ads";
                    const isSelected = selected.includes(l.id);
                    return (
                      <tr
                        key={l.id}
                        className={cn(
                          "transition-colors border-l-4",
                          isSelected
                            ? "border-l-indigo-600 bg-indigo-50/90 hover:bg-indigo-100/80"
                            : isGoogle
                              ? "border-l-blue-600 bg-blue-50/50 hover:bg-blue-100/60"
                              : isWebsite
                                ? "border-l-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/60"
                                : isMeta
                                  ? "border-l-purple-600 bg-purple-50/50 hover:bg-purple-100/60"
                                  : "border-l-slate-300 bg-white hover:bg-slate-50/90"
                        )}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${l.name}`}
                            className="size-4 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelected((s) => (e.target.checked ? [...s, l.id] : s.filter((x) => x !== l.id)))
                            }
                          />
                        </td>
                        {visible("Lead ID") && (
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-bold text-slate-800">
                            <Link href={`/leads/${l.id}`} className="hover:text-indigo-600 hover:underline">
                              {l.id}
                            </Link>
                          </td>
                        )}
                        {visible("Date") && (
                          <td className="whitespace-nowrap px-3 py-3 text-xs">
                            <div className="font-semibold text-slate-900">{formatDate(l.createdAt)}</div>
                            <div className="text-[11px] font-medium text-slate-600">
                              {new Date(l.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                        )}
                        {visible("Student") && (
                          <td className="whitespace-nowrap px-3 py-3">
                            <Link
                              href={`/leads/${l.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline text-sm"
                            >
                              {l.name}
                            </Link>
                            <div className="text-[11px] font-semibold text-slate-600">{l.city}</div>
                          </td>
                        )}
                        {visible("Phone") && (
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-bold text-slate-900">{l.phone}</td>
                        )}
                        {visible("Email") && <td className="px-3 py-3 text-xs font-medium text-slate-700">{l.email}</td>}
                        {visible("Source") && (
                          <td className="px-3 py-3">
                            <SourceBadge value={l.source} />
                          </td>
                        )}
                        {visible("Data") && (
                          <td className="px-3 py-3 min-w-[190px] max-w-[280px]">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold text-slate-800">
                                  {l.attribution?.formId ||
                                    l.tags?.find((t) =>
                                      ["Form", "Predictor", "Calculator", "Compare", "Planner"].some((k) =>
                                        t.includes(k)
                                      )
                                    ) ||
                                    (l.source === "Google Ads" ? "MBBS Abroad Form" : l.source === "Meta Ads" ? "Meta Lead Form" : "Website Inquiry")}
                                </span>
                                {l.neetScore && (
                                  <span className="inline-flex items-center rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                                    NEET: {l.neetScore}
                                  </span>
                                )}
                                {l.budget && (
                                  <span className="inline-flex items-center rounded-md bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900">
                                    {l.budget}
                                  </span>
                                )}
                              </div>
                              {l.parentName && (
                                <span className="text-[11px] font-semibold text-slate-700 truncate">
                                  Parent: {l.parentName}
                                </span>
                              )}
                              {l.university && (
                                <span className="text-[11px] font-semibold text-slate-700 truncate">
                                  Univ: {l.university}
                                </span>
                              )}
                              {l.attribution?.utmContent && !l.parentName && !l.university && (
                                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[240px]">
                                  {l.attribution.utmContent}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {visible("Course") && <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{l.course}</td>}
                        {visible("Country") && <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{l.country}</td>}
                        {visible("Assigned To") && (
                          <td className="whitespace-nowrap px-3 py-3">
                            {(() => {
                              const caller = telecallers.find((t) => t.id === l.assignedTo || t.name === l.assignedTo);
                              const callerName = caller?.name || (l.assignedTo && l.assignedTo !== "null" ? l.assignedTo : null);

                              if (callerName) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 font-bold text-indigo-950 text-xs shadow-2xs">
                                    <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                      {callerName.charAt(0).toUpperCase()}
                                    </span>
                                    {callerName}
                                  </span>
                                );
                              }

                              return (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300 shadow-2xs">
                                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                  Yet to Assign
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visible("Stage") && (
                          <td className="px-3 py-3">
                            <StageBadge value={l.stage} />
                          </td>
                        )}
                        {visible("Status") && (
                          <td className="px-3 py-3">
                            <StatusBadge value={l.status} />
                          </td>
                        )}
                        {visible("Next Follow-up") && (
                          <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-700">
                            {l.nextFollowUp ? formatDate(l.nextFollowUp) : "—"}
                          </td>
                        )}
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/leads/${l.id}`}
                            aria-label={`Open details for ${l.name}`}
                            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs transition"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <ul className="divide-y divide-slate-200 lg:hidden">
              {current.map((l) => {
                const isGoogle = l.source === "Google Ads";
                const isWebsite = l.source === "Website";
                const isMeta = l.source === "Meta Ads";
                const isSelected = selected.includes(l.id);
                return (
                  <li
                    key={l.id}
                    className={cn(
                      "space-y-2 px-4 py-3 border-l-4 transition-colors",
                      isSelected
                        ? "border-l-indigo-600 bg-indigo-50/90"
                        : isGoogle
                          ? "border-l-blue-600 bg-blue-50/50"
                          : isWebsite
                            ? "border-l-emerald-600 bg-emerald-50/50"
                            : isMeta
                              ? "border-l-purple-600 bg-purple-50/50"
                              : "border-l-slate-300 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/leads/${l.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 text-base"
                        >
                          {l.name}
                        </Link>
                        <p className="font-mono text-xs font-semibold text-slate-600">
                          {l.id} · {formatDate(l.createdAt)}
                        </p>
                      </div>
                      <SourceBadge value={l.source} />
                    </div>

                    {/* Data Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold text-slate-800">
                        {l.attribution?.formId ||
                          l.tags?.find((t) =>
                            ["Form", "Predictor", "Calculator", "Compare", "Planner"].some((k) =>
                              t.includes(k)
                            )
                          ) ||
                          (l.source === "Google Ads" ? "MBBS Abroad Form" : l.source === "Meta Ads" ? "Meta Lead Form" : "Website Inquiry")}
                      </span>
                      {l.neetScore && (
                        <span className="rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                          NEET: {l.neetScore}
                        </span>
                      )}
                      {l.budget && (
                        <span className="rounded-md bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900">
                          {l.budget}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <StageBadge value={l.stage} />
                      <StatusBadge value={l.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>
                        {l.course} · {l.country}
                      </span>
                      <Link href={`/leads/${l.id}`} className="font-bold text-indigo-600 hover:underline">
                        View Profile →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Showing {current.length} of {filtered.length.toLocaleString("en-IN")} leads
        </span>
        <div className="flex items-center gap-2">
          <PrimaryButton tone="ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </PrimaryButton>
          <span className="text-numeric text-xs text-muted-foreground">
            Page {page} / {pageCount}
          </span>
          <PrimaryButton
            tone="ghost"
            disabled={page === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </PrimaryButton>
        </div>
      </div>

      {/* ── Assign Leads Modal ── */}
      <AssignLeadsModal
        open={assignLeadsOpen}
        onClose={() => setAssignLeadsOpen(false)}
        preSelectedLeadIds={selected}
      />
    </div>
  );
}
