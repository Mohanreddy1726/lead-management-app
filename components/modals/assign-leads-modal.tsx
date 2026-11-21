"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  UserCheck,
  Users,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  Shield,
  Headphones,
  Check,
  Split,
  User,
  Filter,
} from "lucide-react";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/shared/badges";
import {
  getLeads,
  getTeamMembers,
  bulkAssignLeads,
  distributeLeadsToCallers,
  syncLeadsFromDb,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import type { Lead, TeamMember } from "@/data/types";
import { cn } from "@/lib/utils";

interface AssignLeadsModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedLeadIds?: string[];
}

export function AssignLeadsModal({
  open,
  onClose,
  preSelectedLeadIds = [],
}: AssignLeadsModalProps) {
  const { branch } = useBranch();
  const allLeads = getLeads(branch);
  const team = getTeamMembers(branch);

  // Available telecallers (and managers)
  const availableTelecallers = useMemo(() => {
    const callers = team.filter((m) => m.role === "Telecaller");
    return callers.length > 0 ? callers : team;
  }, [team]);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadFilterTab, setLeadFilterTab] = useState<"unassigned" | "all">("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  // Step 2 Assignment Configuration
  const [mode, setMode] = useState<"single" | "distribute">("single");
  const [selectedTelecallerId, setSelectedTelecallerId] = useState<string>("");
  const [selectedTelecallerIds, setSelectedTelecallerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<{ count: number; target: string } | null>(null);

  // Track modal open transitions — only initialize ONCE when opening
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (preSelectedLeadIds && preSelectedLeadIds.length > 0) {
        setSelectedLeadIds([...preSelectedLeadIds]);
      } else {
        setSelectedLeadIds([]);
      }
      setStep(1);
      setSuccessResult(null);
      setSearchQuery("");
      setSourceFilter("ALL");

      // Set default selected telecaller
      if (availableTelecallers.length > 0) {
        setSelectedTelecallerId(availableTelecallers[0].name);
        setSelectedTelecallerIds([availableTelecallers[0].name]);
      }
    }
    prevOpenRef.current = open;
  }, [open]);

  // Fallback to assign default telecaller if available
  useEffect(() => {
    if (!selectedTelecallerId && availableTelecallers.length > 0) {
      setSelectedTelecallerId(availableTelecallers[0].name);
      setSelectedTelecallerIds([availableTelecallers[0].name]);
    }
  }, [availableTelecallers, selectedTelecallerId]);

  // Filtered pool of leads to choose from
  const candidateLeads = useMemo(() => {
    return allLeads.filter((l) => {
      // 1. Unassigned vs All tab
      if (leadFilterTab === "unassigned" && l.assignedTo) {
        return false;
      }

      // 2. Source filter
      if (sourceFilter !== "ALL" && l.source !== sourceFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = l.name.toLowerCase().includes(q);
        const matchPhone = l.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const matchCity = l.city.toLowerCase().includes(q);
        const matchCourse = l.course.toLowerCase().includes(q);
        const matchForm = l.attribution?.formId?.toLowerCase().includes(q);
        return matchName || matchPhone || matchCity || matchCourse || matchForm;
      }

      return true;
    });
  }, [allLeads, leadFilterTab, sourceFilter, searchQuery]);

  const allCandidateIds = useMemo(() => candidateLeads.map((l) => l.id), [candidateLeads]);
  const isAllSelected =
    allCandidateIds.length > 0 &&
    allCandidateIds.every((id) => selectedLeadIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all candidate leads
      setSelectedLeadIds((prev) => prev.filter((id) => !allCandidateIds.includes(id)));
    } else {
      // Select all candidate leads
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...allCandidateIds])));
    }
  };

  const handleSelectCount = (count: number) => {
    const firstN = allCandidateIds.slice(0, count);
    setSelectedLeadIds(firstN);
  };

  const handleClearAll = () => {
    setSelectedLeadIds([]);
  };

  const handleToggleLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleDistributeTelecaller = (callerName: string) => {
    setSelectedTelecallerIds((prev) =>
      prev.includes(callerName)
        ? prev.filter((x) => x !== callerName)
        : [...prev, callerName]
    );
  };

  // Perform Final Assignment
  const handleConfirmAssignment = async () => {
    if (selectedLeadIds.length === 0) return;
    setLoading(true);

    try {
      if (mode === "single") {
        if (!selectedTelecallerId) {
          alert("Please select a telecaller.");
          setLoading(false);
          return;
        }

        bulkAssignLeads(selectedLeadIds, selectedTelecallerId);
        setSuccessResult({
          count: selectedLeadIds.length,
          target: selectedTelecallerId,
        });
      } else {
        // Distribute evenly among chosen telecallers
        if (selectedTelecallerIds.length === 0) {
          alert("Please select at least one telecaller for distribution.");
          setLoading(false);
          return;
        }

        const assignments = selectedLeadIds.map((leadId, idx) => {
          const caller = selectedTelecallerIds[idx % selectedTelecallerIds.length];
          return { leadId, assignedTo: caller };
        });

        await distributeLeadsToCallers(assignments);
        setSuccessResult({
          count: selectedLeadIds.length,
          target: `${selectedTelecallerIds.length} telecallers (${selectedTelecallerIds.join(", ")})`,
        });
      }

      // Sync central database
      syncLeadsFromDb();
    } catch (err: any) {
      console.error("Assignment error:", err);
      alert("Failed to assign leads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      className="sm:max-w-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl p-6"
    >
      <div className="space-y-4">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Assign Leads to Telecallers
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {step === 1
                  ? "Step 1 of 2: Select the leads you want to allocate"
                  : "Step 2 of 2: Choose which telecaller receives these leads"}
              </p>
            </div>
          </div>

          {/* Step Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            <span
              className={cn(
                "size-2 rounded-full",
                step === 1 ? "bg-indigo-600" : "bg-emerald-600"
              )}
            />
            Step {step} of 2
          </div>
        </div>

        {/* ── SUCCESS STATE ── */}
        {successResult ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">
                Leads Successfully Assigned!
              </h4>
              <p className="text-xs text-slate-700 max-w-md mx-auto leading-relaxed font-medium">
                Allocated <span className="font-bold text-slate-900">{successResult.count}</span> lead(s) to{" "}
                <span className="font-bold text-indigo-700">{successResult.target}</span>. The assigned telecaller will now see these leads in their queue.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 cursor-pointer shadow-xs"
              >
                Close &amp; View Leads
              </Button>
            </div>
          </div>
        ) : step === 1 ? (
          /* ── STEP 1: SELECT LEADS ── */
          <div className="space-y-3.5">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLeadFilterTab("unassigned")}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-bold transition cursor-pointer",
                    leadFilterTab === "unassigned"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Yet to Assign ({allLeads.filter((l) => !l.assignedTo).length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeadFilterTab("all")}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-bold transition cursor-pointer",
                    leadFilterTab === "all"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  All Leads ({allLeads.length})
                </button>
              </div>

              {/* Source Dropdown */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-indigo-600 shadow-2xs"
              >
                <option value="ALL">All Sources</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="Website">Website</option>
                <option value="Google Ads">Google Ads</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search student name, mobile number, city…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
              />
            </div>

            {/* Selection Toolbar & Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleSelectAll();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-slate-400 size-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Select All ({candidateLeads.length})</span>
              </label>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5">
                {candidateLeads.length >= 10 && (
                  <button
                    type="button"
                    onClick={() => handleSelectCount(10)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                  >
                    First 10
                  </button>
                )}
                {candidateLeads.length >= 25 && (
                  <button
                    type="button"
                    onClick={() => handleSelectCount(25)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                  >
                    First 25
                  </button>
                )}
                {selectedLeadIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 shadow-2xs transition cursor-pointer"
                  >
                    Clear ({selectedLeadIds.length})
                  </button>
                )}
                <span className="ml-1 font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                  {selectedLeadIds.length} selected
                </span>
              </div>
            </div>

            {/* Leads List Box */}
            <div className="max-h-[340px] overflow-y-auto rounded-xl border-2 border-slate-200 divide-y divide-slate-200 bg-white shadow-2xs">
              {candidateLeads.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-600 space-y-1">
                  <UserCheck className="mx-auto size-7 opacity-40 text-indigo-600" />
                  <div className="font-bold text-slate-800 text-sm">No leads match your filter</div>
                  <p className="font-medium">Try switching to &quot;All Leads&quot; or clearing your search.</p>
                </div>
              ) : (
                candidateLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleToggleLead(lead.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 transition cursor-pointer select-none text-xs border-l-4",
                        isSelected
                          ? "bg-indigo-50/90 border-l-indigo-600"
                          : "hover:bg-slate-50/90 border-l-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleLead(lead.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-400 size-4 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate text-sm">
                              {lead.name}
                            </span>
                            <SourceBadge value={lead.source} className="scale-90 origin-left" />
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-2 truncate font-medium">
                            <span className="font-mono font-bold text-slate-800">{lead.phone}</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-600">{lead.city}</span>
                            {lead.neetScore && (
                              <>
                                <span>·</span>
                                <span className="text-amber-900 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[11px]">
                                  NEET: {lead.neetScore}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {lead.assignedTo ? (
                          <span className="text-[11px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                            Currently: {lead.assignedTo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Yet to Assign
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer shadow-2xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={selectedLeadIds.length === 0}
                onClick={() => setStep(2)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                Next: Choose Telecallers ({selectedLeadIds.length})
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* ── STEP 2: SELECT TELECALLERS ── */
          <div className="space-y-4">
            {/* Selected Summary Pill */}
            <div className="flex items-center justify-between rounded-xl border-2 border-indigo-200 bg-indigo-50/90 px-3.5 py-2.5 text-xs text-indigo-950 shadow-2xs font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-600 shrink-0" />
                <span>
                  Ready to assign <strong className="font-bold text-indigo-950">{selectedLeadIds.length}</strong> selected lead(s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
              >
                Edit Selection
              </button>
            </div>

            {/* Allocation Strategy Option */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assignment Strategy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition cursor-pointer",
                    mode === "single"
                      ? "border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-xs ring-1 ring-indigo-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <User className="size-4 shrink-0 text-indigo-600" />
                  <div>
                    <div className="font-bold text-xs text-slate-900">Assign to Single Telecaller</div>
                    <div className="text-[11px] font-medium text-slate-600">All leads go to one person</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("distribute")}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition cursor-pointer",
                    mode === "distribute"
                      ? "border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-xs ring-1 ring-indigo-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <Split className="size-4 shrink-0 text-indigo-600" />
                  <div>
                    <div className="font-bold text-xs text-slate-900">Distribute Evenly</div>
                    <div className="text-[11px] font-medium text-slate-600">Split leads across multiple agents</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Telecaller Selection Cards */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {mode === "single"
                  ? "Select Telecaller"
                  : `Select Telecallers to Share the Load (${selectedTelecallerIds.length} selected)`}
              </label>

              {availableTelecallers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs font-medium text-slate-600">
                  No active telecallers found in {branch.toUpperCase()} branch. Please add telecallers in the Team directory first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto p-0.5">
                  {availableTelecallers.map((member) => {
                    const isSelected =
                      mode === "single"
                        ? selectedTelecallerId === member.name
                        : selectedTelecallerIds.includes(member.name);

                    // Compute per-caller share in distribute mode
                    const shareCount =
                      mode === "distribute" && selectedTelecallerIds.length > 0 && isSelected
                        ? Math.ceil(selectedLeadIds.length / selectedTelecallerIds.length)
                        : null;

                    return (
                      <div
                        key={member.id}
                        onClick={() => {
                          if (mode === "single") {
                            setSelectedTelecallerId(member.name);
                          } else {
                            handleToggleDistributeTelecaller(member.name);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border-2 p-3 transition cursor-pointer",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-xs ring-1 ring-indigo-300"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-xs text-white shadow-2xs">
                            {member.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {member.name}
                            </div>
                            <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                              <span>{member.role}</span>
                              <span>·</span>
                              <span>{member.assigned} assigned</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {shareCount !== null && (
                            <span className="rounded-md bg-indigo-100 border border-indigo-300 px-2 py-0.5 text-[10px] font-bold text-indigo-900 shadow-2xs">
                              ~{shareCount} leads
                            </span>
                          )}
                          <div
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full border-2 transition",
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white"
                            )}
                          >
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={loading}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="size-3.5" />
                Back to Leads
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAssignment}
                disabled={
                  loading ||
                  (mode === "single" ? !selectedTelecallerId : selectedTelecallerIds.length === 0)
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Assigning Leads…
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    Confirm &amp; Assign {selectedLeadIds.length} Leads
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
