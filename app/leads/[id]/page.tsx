"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Globe,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Tag,
  Share2,
  Plus,
  Send,
  Upload,
  Check,
  X,
  Sparkles,
  PhoneCall,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import { PageHeader, Panel, StatTile, EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { ScoreBadge, StageBadge, StatusBadge, SourceBadge } from "@/components/shared/badges";
import {
  getLeadById,
  getTimeline,
  getDocuments,
  getPayments,
  getCallsForLead,
  getFollowUpsForLead,
  getTelecallers,
  updateLead,
  updateDocumentStatus,
  recordPayment,
  addTimelineEvent,
  store,
  formatDate,
  formatDateTime,
  formatINR,
} from "@/services/api";
import { STAGES, STATUSES } from "@/data/mock";
import { LogCallModal } from "@/components/modals/log-call-modal";
import { ScheduleFollowUpModal } from "@/components/modals/schedule-follow-up-modal";
import { Modal, Field, inputClass, selectClass, PrimaryButton } from "@/components/modals/modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Lead, DocumentItem, Payment } from "@/data/types";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading student lead profile…
          </div>
        </div>
      }
    >
      <LeadDetailContent params={params} />
    </React.Suspense>
  );
}

function LeadDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);

  // Subscribe to reactive store changes
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const lead = getLeadById(id);
  const telecallers = getTelecallers();

  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "calls" | "followups" | "documents" | "payments"
  >("overview");

  // Modals state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");

  // Quick note state
  const [quickNote, setQuickNote] = useState("");

  if (!lead) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12">
        <Panel>
          <EmptyState
            title="Student Lead Not Found"
            description={`No student record exists with Lead ID: ${id}. The lead may have been deleted or archived.`}
            action={
              <Button asChild>
                <Link href="/leads">← Return to Leads Roster</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const timeline = getTimeline(lead.id);
  const documents = getDocuments(lead.id);
  const payments = getPayments(lead.id);
  const calls = getCallsForLead(lead.id);
  const followUps = getFollowUpsForLead(lead.id);

  const totalFee = payments.reduce((acc, p) => acc + p.total, 0);
  const paidFee = payments.reduce((acc, p) => acc + p.paid, 0);
  const pendingFee = totalFee - paidFee;
  const paymentProgress = totalFee > 0 ? Math.round((paidFee / totalFee) * 100) : 0;

  const verifiedDocsCount = documents.filter((d) => d.status === "Verified").length;

  const handleStageChange = (newStage: Lead["stage"]) => {
    updateLead(lead.id, { stage: newStage });
    toast.success(`Stage updated to ${newStage}`);
  };

  const handleStatusChange = (newStatus: Lead["status"]) => {
    updateLead(lead.id, { status: newStatus });
    toast.success(`Status updated to ${newStatus}`);
  };

  const handleTelecallerChange = (telecallerId: string) => {
    updateLead(lead.id, { assignedTo: telecallerId || null });
    const caller = telecallers.find((t) => t.id === telecallerId);
    toast.success(`Reassigned to ${caller?.name || "Yet to Assign"}`);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    addTimelineEvent(lead.id, {
      type: "note",
      title: "Counsellor Remark Added",
      detail: quickNote.trim(),
      actor: "Counsellor",
    });

    setQuickNote("");
    toast.success("Note added to lead timeline");
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    recordPayment(lead.id, selectedPayment.id, amountNum);
    toast.success("Payment recorded", {
      description: `${formatINR(amountNum)} paid towards ${selectedPayment.head}`,
    });
    setPaymentModalOpen(false);
    setSelectedPayment(null);
    setPayAmount("");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ── Top Breadcrumbs & Back Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Leads</span>
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{lead.id}</span>
      </div>

      {/* ── Student Hero Profile Header ── */}
      <div className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="size-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shrink-0">
              {lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                  {lead.name}
                </h1>
                <ScoreBadge score={lead.score} showBand={true} />
                {calls.length === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Uncontacted (0 Calls)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <Phone className="size-3 fill-emerald-600 text-emerald-600" />
                    {calls.length === 1 ? "Contacted 1 time" : `Contacted ${calls.length} times`}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Phone className="size-3.5 text-primary" /> {lead.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5 text-muted-foreground" /> {lead.email}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground" /> {lead.city}, {lead.state}
                </span>
                <span className="flex items-center gap-1">
                  <SourceBadge value={lead.source} />
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs text-xs font-semibold"
              onClick={() => setCallModalOpen(true)}
            >
              <PhoneCall className="size-3.5" />
              <span>Log Call</span>
            </Button>

            <Button
              variant="outline"
              className="gap-1.5 text-xs font-semibold"
              onClick={() => setFollowUpModalOpen(true)}
            >
              <CalendarClock className="size-3.5 text-amber-500" />
              <span>Schedule Follow-up</span>
            </Button>

            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* ── Journey Control Bar ── */}
        <div className="mt-6 pt-5 border-t border-border grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Stage
            </label>
            <select
              className="h-8 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
              value={lead.stage}
              onChange={(e) => handleStageChange(e.target.value as Lead["stage"])}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Disposition / Status
            </label>
            <select
              className="h-8 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as Lead["status"])}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Assigned Counsellor
            </label>
            <select
              className="h-8 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
              value={lead.assignedTo || ""}
              onChange={(e) => handleTelecallerChange(e.target.value)}
            >
              <option value="">Yet to Assign</option>
              {telecallers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.team})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Quick KPI Row ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Next Scheduled Follow-up"
          value={lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "Not set"}
          tone={lead.nextFollowUp ? "text-amber-600" : "text-muted-foreground"}
        />
        <StatTile
          label="Documents Verified"
          value={`${verifiedDocsCount} / ${documents.length}`}
          tone={verifiedDocsCount === documents.length ? "text-success" : "text-primary"}
        />
        <StatTile
          label="Fee Paid / Total"
          value={`${formatINR(paidFee)} (${paymentProgress}%)`}
          tone={paidFee > 0 ? "text-success" : "text-muted-foreground"}
        />
        <StatTile
          label="Total Calls Logged"
          value={calls.length}
          tone="text-foreground"
        />
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-border overflow-x-auto gap-1">
        {[
          { key: "overview", label: "Student Profile" },
          { key: "timeline", label: `Timeline (${timeline.length})` },
          { key: "calls", label: `Call Logs (${calls.length})` },
          { key: "followups", label: `Follow-ups (${followUps.length})` },
          { key: "documents", label: `Documents (${verifiedDocsCount}/${documents.length})` },
          { key: "payments", label: `Fees & Payments (${formatINR(paidFee)})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW & PROFILE ── */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Academic & Admission Intent" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Target Course
                </span>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-primary" />
                  {lead.course}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Preferred Country
                </span>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="size-4 text-primary" />
                  {lead.country}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Target University
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {lead.university || "Semey State Medical University (Shortlisted)"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  NEET Examination Score
                </span>
                <p className="text-sm font-semibold text-indigo-600">
                  {lead.neetScore ? `${lead.neetScore} / 720 (Qualified)` : "420 / 720 (NEET 2026)"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Parent / Guardian Details
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {lead.parentName || "Suresh Sharma (Father) · In touch"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Estimated Total Budget
                </span>
                <p className="text-sm font-semibold text-emerald-600">
                  {lead.budget || "₹22L - ₹26L (All-inclusive 5 years)"}
                </p>
              </div>
            </div>

            {/* Score Breakdown factors */}
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lead Intent & Scoring Breakdown
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {lead.scoreBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                  >
                    <span className="text-foreground">{item.label}</span>
                    <span
                      className={cn(
                        "font-semibold px-2 py-0.5 rounded text-[11px]",
                        item.earned
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      +{item.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Marketing Attribution Card */}
          <div className="space-y-6">
            <Panel title="Acquisition & Attribution" description="First-touch marketing origin">
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Channel:</span>
                  <SourceBadge value={lead.source} />
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">UTM Source:</span>
                  <span className="font-mono text-foreground font-medium">
                    {lead.attribution.utmSource || "meta"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="font-medium text-foreground">
                    {lead.attribution.utmCampaign || "MBBS_Kazakhstan_2026_Inquiry"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Landing Page:</span>
                  <span className="font-mono text-[11px] text-primary truncate max-w-[180px]">
                    {lead.attribution.landingPage || "/admissions/kazakhstan-mbbs"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Created Date:</span>
                  <span className="text-foreground">{formatDateTime(lead.createdAt)}</span>
                </div>
              </div>
            </Panel>

            {/* Quick Note Box */}
            <Panel title="Post Quick Remark" description="Adds an instant note to student timeline">
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={3}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Record parent discussion note, eligibility update, or next action…"
                  className="w-full rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <Button type="submit" size="sm" className="w-full text-xs gap-1.5">
                  <Send className="size-3" /> Post Note to Timeline
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      )}

      {/* ── TAB 2: TIMELINE ── */}
      {activeTab === "timeline" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Complete Activity & History Stream" className="lg:col-span-2" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {timeline.map((evt) => (
                <li key={evt.id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {evt.type === "call" ? (
                        <PhoneCall className="size-3.5" />
                      ) : evt.type === "payment" ? (
                        <DollarSign className="size-3.5 text-emerald-600" />
                      ) : evt.type === "document" ? (
                        <FileText className="size-3.5 text-amber-500" />
                      ) : (
                        <Clock className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground">{evt.title}</p>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDateTime(evt.at)}
                        </span>
                      </div>
                      {evt.detail && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{evt.detail}</p>
                      )}
                      {evt.meta?.recordingUrl && (
                        <div className="mt-2 rounded-xl bg-slate-900 text-white p-3 space-y-2 shadow-sm max-w-lg">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                              <Sparkles className="size-3.5" /> Call Recording Replay
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">{evt.meta.duration}</span>
                          </div>
                          <audio controls className="w-full h-8" preload="none" src={evt.meta.recordingUrl} />
                          {evt.meta.aiSummary && (
                            <div className="rounded-lg bg-white/10 p-2 text-xs text-slate-200">
                              <strong className="text-indigo-300">AI Summary:</strong> {evt.meta.aiSummary}
                            </div>
                          )}
                        </div>
                      )}
                      {evt.actor && (
                        <p className="text-[11px] text-primary/80 font-medium">Logged by: {evt.actor}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Timeline Entry Form */}
          <Panel title="Add Note or Event" description="Record offline visits or counsellor interactions">
            <form onSubmit={handleAddNote} className="space-y-3">
              <Field label="Remark / Note">
                <textarea
                  rows={4}
                  required
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Student visited our Somajiguda branch with uncle. Compared Semey vs Tbilisi…"
                  className="w-full rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </Field>
              <Button type="submit" size="sm" className="w-full text-xs gap-1.5">
                <Plus className="size-3.5" /> Add Timeline Entry
              </Button>
            </form>
          </Panel>
        </div>
      )}

      {/* ── TAB 3: CALL LOGS ── */}
      {activeTab === "calls" && (
        <Panel
          title="Telecaller Call Logs"
          description="Detailed call notes, durations, and recorded outcomes"
          actions={
            <Button size="sm" onClick={() => setCallModalOpen(true)} className="text-xs gap-1">
              <PhoneCall className="size-3.5" /> Log New Call
            </Button>
          }
          bodyClassName="p-0"
        >
          {calls.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No calls logged yet for this lead. Click "Log New Call" to record a conversation.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {calls.map((c) => (
                <li key={c.id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          value={
                            c.outcome === "Connected"
                              ? "Contacted"
                              : c.outcome === "Interested"
                                ? "Interested"
                                : c.outcome
                          }
                        />
                        <span className="font-mono text-xs text-muted-foreground font-semibold">
                          {c.duration}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-medium pt-1">{c.notes}</p>
                      {c.nextAction && (
                        <p className="text-xs text-indigo-600 font-semibold">
                          Next Action: {c.nextAction}
                        </p>
                      )}
                      {c.recordingUrl && (
                        <div className="mt-2.5 rounded-2xl bg-slate-900 text-white p-3 space-y-2 shadow-sm max-w-lg">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                              <Sparkles className="size-3.5" /> Call Recording Replay
                            </span>
                            <a
                              href={c.recordingUrl}
                              download
                              className="text-[11px] text-slate-400 hover:text-indigo-300 font-mono underline"
                            >
                              Download Audio
                            </a>
                          </div>
                          <audio controls className="w-full h-8" preload="none" src={c.recordingUrl} />
                          {c.aiSummary?.overview && (
                            <div className="rounded-xl bg-white/10 p-2.5 text-xs text-slate-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-300 flex items-center gap-1">
                                  <span>AI Intelligence Summary</span>
                                </span>
                                {c.aiSummary.sentiment && (
                                  <span className="text-[10px] font-semibold px-2 py-0.2 bg-indigo-500/30 text-indigo-200 rounded-full border border-indigo-400/30">
                                    {c.aiSummary.sentiment}
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed text-[11px]">{c.aiSummary.overview}</p>
                              {c.aiSummary.keyPoints && c.aiSummary.keyPoints.length > 0 && (
                                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-300 pt-1">
                                  {c.aiSummary.keyPoints.map((kp: string, idx: number) => (
                                    <li key={idx}>{kp}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(c.date)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ── TAB 4: FOLLOW-UPS ── */}
      {activeTab === "followups" && (
        <Panel
          title="Scheduled Follow-up Reminders"
          description="Tasks and callbacks assigned for this student"
          actions={
            <Button size="sm" onClick={() => setFollowUpModalOpen(true)} className="text-xs gap-1">
              <CalendarClock className="size-3.5" /> Schedule Follow-up
            </Button>
          }
        >
          {followUps.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No follow-ups scheduled for this lead. Click above to create one.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {followUps.map((f) => (
                <div key={f.id} className="panel p-4 space-y-2 border">
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge value={f.status} />
                    <StatusBadge value={f.priority} />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{f.reason}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDateTime(f.date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── TAB 5: DOCUMENTS CHECKLIST ── */}
      {activeTab === "documents" && (
        <Panel
          title="Document Verification & Checklist"
          description="Track incoming student certificates and university admission eligibility documents"
          actions={
            <span className="text-xs font-semibold text-primary">
              {verifiedDocsCount} of {documents.length} verified
            </span>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Document Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Last Updated</th>
                  <th className="px-4 py-2.5 text-right font-medium">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.name} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span>{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block",
                          doc.status === "Verified"
                            ? "bg-emerald-100 text-emerald-700"
                            : doc.status === "Received"
                              ? "bg-cyan-100 text-cyan-700"
                              : doc.status === "Requested"
                                ? "bg-amber-100 text-amber-700"
                                : doc.status === "Rejected"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {doc.updatedAt ? formatDate(doc.updatedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        aria-label={`Update status for ${doc.name}`}
                        className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                        value={doc.status}
                        onChange={(e) => {
                          updateDocumentStatus(
                            lead.id,
                            doc.name,
                            e.target.value as DocumentItem["status"]
                          );
                          toast.success(`${doc.name} marked as ${e.target.value}`);
                        }}
                      >
                        <option value="Not Requested">Not Requested</option>
                        <option value="Requested">Requested</option>
                        <option value="Received">Received</option>
                        <option value="Verified">Verified</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── TAB 6: FEES & PAYMENTS ── */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total Fee Schedule" value={formatINR(totalFee)} />
            <StatTile
              label="Total Fee Paid"
              value={formatINR(paidFee)}
              tone="text-success"
            />
            <StatTile
              label="Pending Balance"
              value={formatINR(pendingFee)}
              tone={pendingFee > 0 ? "text-warning" : "text-muted-foreground"}
            />
          </div>

          <Panel
            title="Payment Heads & Instalments"
            description="Official breakdown across university tuition, consultancy service fee, hostel and visa charges"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Fee Head</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total Payable</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount Paid</th>
                    <th className="px-4 py-2.5 text-center font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Due Date</th>
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.head}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {formatINR(p.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        {formatINR(p.paid)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge value={p.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(p.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={p.paid >= p.total}
                          className="text-xs h-7 gap-1"
                          onClick={() => {
                            setSelectedPayment(p);
                            setPayAmount(String(p.total - p.paid));
                            setPaymentModalOpen(true);
                          }}
                        >
                          <DollarSign className="size-3" /> Record Payment
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ── Log Call Modal ── */}
      <LogCallModal
        open={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        leadId={lead.id}
        leadName={lead.name}
      />

      {/* ── Schedule Follow-up Modal ── */}
      <ScheduleFollowUpModal
        open={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        leadId={lead.id}
        leadName={lead.name}
      />

      {/* ── Record Payment Modal ── */}
      {selectedPayment && (
        <Modal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={`Record Fee Payment · ${selectedPayment.head}`}
          description={`Student: ${lead.name} (${lead.id})`}
          footer={
            <>
              <PrimaryButton tone="ghost" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </PrimaryButton>
              <PrimaryButton onClick={handleRecordPayment}>
                Confirm Receipt & Save
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee Head:</span>
                <span className="font-semibold text-foreground">{selectedPayment.head}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee:</span>
                <span className="font-semibold">{formatINR(selectedPayment.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="text-emerald-600 font-semibold">{formatINR(selectedPayment.paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding:</span>
                <span className="text-amber-600 font-bold">
                  {formatINR(selectedPayment.total - selectedPayment.paid)}
                </span>
              </div>
            </div>

            <Field label="Amount Paid (₹) *">
              <input
                type="number"
                required
                className={inputClass}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="e.g. 50000"
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
