"use client";

import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Phone,
  PhoneCall,
  MessageCircle,
  CalendarClock,
  Clock,
  UserCheck,
  Users,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  Flame,
  Award,
  ChevronRight,
  ChevronDown,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  Target,
  FileText,
  Copy,
  ExternalLink,
  Shield,
  Coffee,
  RotateCcw,
  Smartphone,
  Download,
  AlertCircle,
  X,
  Send,
  Check,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLeads,
  getTelecallers,
  getFollowUps,
  getCalls,
  logCall,
  scheduleFollowUp,
  formatDate,
  store,
  syncLeadsFromDb,
  syncTeamFromDb,
} from "@/services/api";
import { SourceBadge, StageBadge, StatusBadge, ScoreBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBranch } from "@/context/BranchContext";
import { toast } from "sonner";
import type { Lead, Telecaller, Branch } from "@/data/types";

// Common Quick Remark Snippets for 1-tap addition
const QUICK_NOTES = [
  "Interested in 5-yr budget package",
  "NEET qualified, comparing universities",
  "Requested university fee brochure on WhatsApp",
  "Parents will visit Hyderabad branch",
  "Asked to call back in evening (after 6 PM)",
  "Documents pending (10th/12th/Passport)",
  "Student busy in class, callback requested",
  "Exploring low-budget Kazakhstan/Georgia options",
];

// Call outcome choices with high-contrast colors
const CALL_OUTCOMES = [
  { label: "Interested", tone: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500", icon: "🟢" },
  { label: "Follow-up", tone: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500", icon: "🟡" },
  { label: "Parent Discussion", tone: "bg-blue-50 text-blue-800 border-blue-300 ring-blue-500", icon: "🔵" },
  { label: "Sent Fee Details", tone: "bg-purple-50 text-purple-800 border-purple-300 ring-purple-500", icon: "🟣" },
  { label: "Ringing / No Answer", tone: "bg-orange-50 text-orange-800 border-orange-300 ring-orange-500", icon: "🟠" },
  { label: "Busy / Call Later", tone: "bg-slate-100 text-slate-800 border-slate-300 ring-slate-500", icon: "⚪" },
  { label: "Not Interested", tone: "bg-rose-50 text-rose-800 border-rose-300 ring-rose-500", icon: "🔴" },
  { label: "Wrong Number", tone: "bg-red-50 text-red-900 border-red-300 ring-red-500", icon: "❌" },
];

export function TelecallerMobileDashboard() {
  const router = useRouter();
  const { branch, canSwitchBranch, switchBranch } = useBranch();
  const { data: session } = useSession();
  useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);

  // Hydrate store data
  useEffect(() => {
    syncTeamFromDb();
    syncLeadsFromDb();
  }, []);

  // Telecaller resolution
  const telecallers = getTelecallers(branch);
  const sessionUser = session?.user;
  const loggedInCaller = telecallers.find(
    (t) =>
      (sessionUser?.email && t.email?.toLowerCase() === sessionUser.email.toLowerCase()) ||
      (sessionUser?.name && t.name?.toLowerCase() === sessionUser.name.toLowerCase()) ||
      ((sessionUser as any)?.id && t.id === (sessionUser as any)?.id)
  ) || telecallers[0];

  const callerName = loggedInCaller?.name || sessionUser?.name || "Admissions Counsellor";
  const callerId = loggedInCaller?.id || (sessionUser as any)?.id || "tc-1";

  // Data pools
  const leads = getLeads(branch);
  const myAssignedLeads = useMemo(
    () => leads.filter((l) => l.assignedTo === callerName || l.assignedTo === callerId),
    [leads, callerName, callerId]
  );
  const activeQueueLeads = myAssignedLeads.length > 0 ? myAssignedLeads : leads;

  const allFollowUps = getFollowUps(branch);
  const myFollowUps = allFollowUps.filter(
    (f) => f.telecallerId === callerId || f.telecallerId === callerName
  );
  const activeFollowUps = myFollowUps.length > 0 ? myFollowUps : allFollowUps;

  const allCalls = getCalls(branch);
  const myCalls = allCalls.filter((c) => c.telecallerId === callerId || c.telecallerId === callerName);
  const activeCalls = myCalls.length > 0 ? myCalls : allCalls;

  // Telecaller Presence Status state (Active, In Call, Break, Offline)
  const [presence, setPresence] = useState<"Active" | "In Call" | "On Break" | "Offline">("Active");
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Active Mobile View Tab: 'queue' | 'followups' | 'leads' | 'history' | 'targets'
  const [activeTab, setActiveTab] = useState<"queue" | "followups" | "leads" | "history" | "targets">("queue");

  // Queue Filter Chip: 'all' | 'today' | 'hot' | 'neet' | 'uncontacted'
  const [queueFilter, setQueueFilter] = useState<"all" | "today" | "hot" | "neet" | "uncontacted">("all");

  // Quick Mobile Search Query
  const [searchQuery, setSearchQuery] = useState("");

  // In-Call Active Sheet State
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [callOutcome, setCallOutcome] = useState("Interested");
  const [callNotes, setCallNotes] = useState("");
  const [scheduleFollowUpDate, setScheduleFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");

  // WhatsApp template modal state
  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPwa =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isPwa);

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPwaBanner(true);
      };

      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Lead.OS added to your Home Screen!");
      }
      setDeferredPrompt(null);
      setShowPwaBanner(false);
    } else {
      toast.info("To install on iOS: Tap Share ➔ Add to Home Screen");
    }
  };

  // Timer loop for active call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCallLead) {
      setCallTimer(0);
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCallLead]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Trigger Phone Call and launch in-call sheet
  const handleStartCall = (lead: Lead) => {
    setActiveCallLead(lead);
    setCallOutcome("Interested");
    setCallNotes("");
    setScheduleFollowUpDate("");
    setFollowUpReason("");
    setPresence("In Call");

    // Standard mobile tel: URI triggers device phone dialer
    const cleanPhone = lead.phone.replace(/[^\d+]/g, "");
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  // End Call & Log
  const handleSaveAndNext = () => {
    if (activeCallLead) {
      const duration = formatTimer(callTimer);
      logCall({
        leadId: activeCallLead.id,
        telecallerId: callerId,
        outcome: callOutcome,
        notes: callNotes.trim() || `Dialer call with ${activeCallLead.name}. Outcome: ${callOutcome}`,
        duration,
        nextAction: followUpReason || (callOutcome === "Interested" ? "Share fee structure & shortlist" : undefined),
        followUpDate: scheduleFollowUpDate || undefined,
      });

      toast.success(`Call logged for ${activeCallLead.name} (${callOutcome})`);

      // Find next lead in queue
      const currentIndex = filteredQueue.findIndex((l) => l.id === activeCallLead.id);
      const nextLead = filteredQueue[currentIndex + 1] || null;

      if (nextLead) {
        // Automatically queue next lead
        handleStartCall(nextLead);
      } else {
        setActiveCallLead(null);
        setPresence("Active");
      }
    }
  };

  const handleCloseCallModal = () => {
    if (activeCallLead && callTimer > 3) {
      if (confirm("End call and save log before closing?")) {
        handleSaveAndNext();
        return;
      }
    }
    setActiveCallLead(null);
    setPresence("Active");
  };

  // WhatsApp Helper
  const handleOpenWhatsApp = (lead: Lead) => {
    const defaultMsg =
      branch === "masters"
        ? `Hello ${lead.name}! I am ${callerName} from GVK EduTech. Following up regarding your inquiry for Masters Abroad (${lead.country || "Germany / UK / USA"}). When is a good time to discuss university shortlists and deadlines?`
        : `Hello ${lead.name}! I am ${callerName} from GVK EduTech. Reaching out regarding your inquiry for MBBS Abroad (${lead.country || "Kazakhstan / Georgia"}). Would you like me to share the 5-year fee structure and WHO/NMC recognized university list on WhatsApp?`;

    setWhatsAppLead(lead);
    setWhatsAppMessage(defaultMsg);
  };

  const handleSendWhatsApp = () => {
    if (!whatsAppLead) return;
    const cleanPhone = whatsAppLead.phone.replace(/[^\d]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsAppMessage)}`;
    window.open(url, "_blank");
    setWhatsAppLead(null);
    toast.success("WhatsApp chat opened");
  };

  // Filtered Queue computation
  const filteredQueue = useMemo(() => {
    let list = activeQueueLeads;

    // Apply queue filter chips
    if (queueFilter === "today") {
      list = list.filter((l) => l.nextFollowUp || l.stage === "New" || l.stage === "Assigned");
    } else if (queueFilter === "hot") {
      list = list.filter((l) => l.score >= 70 || l.tags?.includes("Hot") || l.tags?.includes("Urgent"));
    } else if (queueFilter === "neet") {
      list = list.filter((l) => (l.neetScore && l.neetScore >= 350) || l.tags?.includes("NEET Qualified"));
    } else if (queueFilter === "uncontacted") {
      list = list.filter((l) => l.stage === "New" || l.stage === "Assigned");
    }

    // Apply text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) =>
        [l.name, l.phone, l.city, l.id, l.course, l.country].some((f) =>
          (f || "").toLowerCase().includes(q)
        )
      );
    }

    return list;
  }, [activeQueueLeads, queueFilter, searchQuery]);

  // Priority "Up Next" Lead
  const nextLeadToCall = filteredQueue[0] || activeQueueLeads[0];

  // Daily target metrics
  const defaultTargets = [
    { label: "Daily Calls", done: activeCalls.length, target: 35 },
    { label: "Follow-ups", done: activeFollowUps.filter((f) => f.status === "Completed").length, target: 15 },
    { label: "Interested Leads", done: myAssignedLeads.filter((l) => l.stage === "Interested").length, target: 8 },
    { label: "Admissions Closed", done: myAssignedLeads.filter((l) => l.stage === "Admission").length, target: 3 },
  ];
  const targets = (loggedInCaller?.targets && loggedInCaller.targets.length > 0) ? loggedInCaller.targets : defaultTargets;
  const callsGoal = targets.find((t) => t.label.toLowerCase().includes("call")) || defaultTargets[0];
  const callsPct = Math.min(100, Math.round(((callsGoal.done || activeCalls.length) / (callsGoal.target || 35)) * 100));

  return (
    <div className="w-full min-h-screen pb-24 md:pb-8 bg-slate-50/90 text-slate-900 select-none antialiased">
      {/* ── TOP PWA APP BAR / HEADER ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3.5 py-2.5 shadow-2xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2.5">
          {/* Telecaller Presence Avatar & Greeting */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="size-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                {(callerName || "TC").slice(0, 2).toUpperCase()}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ring-1",
                  presence === "Active"
                    ? "bg-emerald-500 ring-emerald-400"
                    : presence === "In Call"
                      ? "bg-indigo-600 ring-indigo-400 animate-pulse"
                      : presence === "On Break"
                        ? "bg-amber-500 ring-amber-400"
                        : "bg-slate-400 ring-slate-300"
                )}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm text-slate-900 truncate">{callerName}</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Dialer
                </span>
              </div>

              {/* Status Switcher Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>{presence === "Active" ? "Ready to Call" : presence}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </button>

                {showStatusMenu && (
                  <div className="absolute left-0 top-6 z-40 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setPresence("Active");
                        setShowStatusMenu(false);
                        toast.success("Status: Ready to Call");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-50 text-emerald-800"
                    >
                      <span className="size-2 rounded-full bg-emerald-500" />
                      On Duty · Ready
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPresence("On Break");
                        setShowStatusMenu(false);
                        toast.info("Status: On Break");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-50 text-amber-800"
                    >
                      <Coffee className="size-3.5 text-amber-600" />
                      Short Break (15m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPresence("Offline");
                        setShowStatusMenu(false);
                        toast.info("Status: Shift Ended");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 text-slate-700"
                    >
                      <span className="size-2 rounded-full bg-slate-400" />
                      Shift Ended / Offline
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <LogOut className="size-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Action: Branch Toggle, Refresh & Logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canSwitchBranch ? (
              <button
                type="button"
                onClick={() => switchBranch(branch === "mbbs" ? "masters" : "mbbs")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer",
                  branch === "masters"
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                )}
              >
                <span>{branch === "masters" ? "🎓" : "🩺"}</span>
                <span className="capitalize">{branch}</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {branch.toUpperCase()}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                syncLeadsFromDb(true);
                toast.success("Leads refreshed");
              }}
              className="size-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh Queue"
            >
              <RotateCcw className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="size-8 rounded-xl border border-rose-200 bg-rose-50/80 flex items-center justify-center text-rose-600 hover:text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── PWA INSTALL BANNER IF NOT STANDALONE ── */}
        {showPwaBanner && !isStandalone && (
          <div className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-2.5 text-white flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 min-w-0 text-xs">
              <Smartphone className="size-4 shrink-0 text-indigo-200" />
              <span className="font-semibold truncate">Install Lead.OS for 1-tap mobile calling</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallPwa}
                className="bg-white text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-xs shadow-xs cursor-pointer"
              >
                Install
              </button>
              <button
                type="button"
                onClick={() => setShowPwaBanner(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── MAIN MOBILE CONTAINER ── */}
      <main className="max-w-3xl mx-auto px-3.5 pt-3 space-y-3.5">
        {/* ── KPI PROGRESS CARDS (TOUCH CAROUSEL) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Today's Calls */}
          <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 to-white p-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
              <span>Calls Today</span>
              <PhoneCall className="size-3.5 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{activeCalls.length}</span>
              <span className="text-xs text-slate-500 font-semibold">/ 35 target</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${callsPct}%` }}
              />
            </div>
          </div>

          {/* Card 2: Queue */}
          <div
            onClick={() => setActiveTab("queue")}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs cursor-pointer active:scale-98 transition"
          >
            <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
              <span>Calling Queue</span>
              <Users className="size-3.5 text-slate-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{filteredQueue.length}</span>
              <span className="text-xs text-emerald-600 font-bold">Active</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-medium truncate">
              {myAssignedLeads.length} leads assigned to you
            </div>
          </div>

          {/* Card 3: Follow-ups */}
          <div
            onClick={() => setActiveTab("followups")}
            className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-white p-3 shadow-2xs cursor-pointer active:scale-98 transition"
          >
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
              <span>Follow-ups</span>
              <CalendarClock className="size-3.5 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{activeFollowUps.length}</span>
              <span className="text-xs text-amber-700 font-semibold">Due today</span>
            </div>
            <div className="mt-2 text-[10px] text-amber-800 font-bold truncate">
              {activeFollowUps.filter((f) => f.status === "Overdue").length} overdue
            </div>
          </div>

          {/* Card 4: Admissions */}
          <div
            onClick={() => setActiveTab("targets")}
            className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-white p-3 shadow-2xs cursor-pointer active:scale-98 transition"
          >
            <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span>Admissions</span>
              <Award className="size-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {myAssignedLeads.filter((l) => l.stage === "Admission" || l.stage === "Converted").length}
              </span>
              <span className="text-xs text-emerald-700 font-bold">Converted</span>
            </div>
            <div className="mt-2 text-[10px] text-emerald-700 font-medium truncate">
              Quota: on track (+12%)
            </div>
          </div>
        </div>

        {/* ── STICKY HERO "UP NEXT IN QUEUE" CARD ── */}
        {nextLeadToCall && activeTab === "queue" && (
          <div className="rounded-2xl border-2 border-indigo-600 bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white p-4 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 size-28 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 text-xs font-bold text-indigo-200 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>Next Call Priority</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">
                Score: {nextLeadToCall.score}
              </span>
            </div>

            <div className="mt-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-white truncate">
                  {nextLeadToCall.name}
                </h2>
                <p className="text-xs text-indigo-200 font-mono mt-0.5">
                  {nextLeadToCall.phone} · {nextLeadToCall.city}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-bold text-white">
                    {nextLeadToCall.course} ({nextLeadToCall.country})
                  </span>
                  {nextLeadToCall.neetScore && (
                    <span className="rounded-md bg-amber-400/90 text-amber-950 px-1.5 py-0.5 font-black">
                      NEET: {nextLeadToCall.neetScore}
                    </span>
                  )}
                  {nextLeadToCall.budget && (
                    <span className="rounded-md bg-emerald-400/90 text-emerald-950 px-1.5 py-0.5 font-black">
                      {nextLeadToCall.budget}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick 1-Tap Action Row */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={() => handleStartCall(nextLeadToCall)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs py-2.5 shadow-md cursor-pointer transition"
              >
                <Phone className="size-4 fill-white" />
                <span>Call Now</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenWhatsApp(nextLeadToCall)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2.5 border border-emerald-400/40 shadow-xs cursor-pointer transition"
              >
                <MessageCircle className="size-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, mobile number, course or city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips Carousel (Only for Queue Tab) */}
          {activeTab === "queue" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "all", label: `All Queue (${activeQueueLeads.length})` },
                { id: "today", label: "Scheduled Today" },
                { id: "hot", label: "🔥 Hot Leads" },
                { id: "neet", label: "NEET 350+" },
                { id: "uncontacted", label: "New Leads" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQueueFilter(chip.id as any)}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs",
                    queueFilter === chip.id
                      ? "bg-indigo-600 text-white"
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── VIEW TABS CONTENT ── */}
        {activeTab === "queue" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>Calling Queue ({filteredQueue.length} students)</span>
              <span>Sorted by priority score</span>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-600" />
                <div className="font-bold text-sm text-slate-800">Queue is Clear!</div>
                <p>No student leads matching your current filter in this division.</p>
              </div>
            ) : (
              filteredQueue.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-xs transition space-y-2.5"
                >
                  {/* Top line: Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 truncate"
                        >
                          {lead.name}
                        </Link>
                        <ScoreBadge score={lead.score || 75} />
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-slate-800">{lead.phone}</span>
                        <span>·</span>
                        <span>{lead.city}</span>
                      </div>
                    </div>

                    <SourceBadge value={lead.source} />
                  </div>

                  {/* Highlights Line */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-slate-800">
                      {lead.course} ({lead.country})
                    </span>
                    {lead.neetScore && (
                      <span className="rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 font-bold text-amber-900">
                        NEET: {lead.neetScore}
                      </span>
                    )}
                    {lead.budget && (
                      <span className="rounded-md bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 font-bold text-emerald-900">
                        {lead.budget}
                      </span>
                    )}
                    {lead.parentName && (
                      <span className="rounded-md bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-slate-600">
                        Parent: {lead.parentName}
                      </span>
                    )}
                  </div>

                  {/* Quick Action Button Row */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleStartCall(lead)}
                      className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2 shadow-xs cursor-pointer transition"
                    >
                      <Phone className="size-3.5 fill-white" />
                      <span>Call Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(lead)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 active:scale-95 font-bold text-xs py-2 cursor-pointer transition"
                      title="Send WhatsApp message"
                    >
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      <span>Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveCallLead(lead);
                        setCallOutcome("Follow-up");
                        setCallNotes("");
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 active:scale-95 font-bold text-xs py-2 cursor-pointer transition"
                      title="Log Call or Schedule Follow-up"
                    >
                      <CalendarClock className="size-3.5 text-indigo-600" />
                      <span>Log</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 2: FOLLOW-UPS VIEW ── */}
        {activeTab === "followups" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>Today&apos;s Follow-up Callbacks ({activeFollowUps.length})</span>
            </div>

            {activeFollowUps.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No callbacks scheduled for today. Great job!
              </div>
            ) : (
              activeFollowUps.map((item, idx) => {
                const lead = leads.find((l) => l.id === item.leadId) || (leads.length > 0 ? leads[idx % leads.length] : null);
                const isOverdue = item.status === "Overdue";
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-3.5 bg-white shadow-2xs space-y-2.5 transition",
                      isOverdue ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{lead?.name || "Student"}</span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              isOverdue ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-900 border-amber-300"
                            )}
                          >
                            {isOverdue ? "Overdue" : "Scheduled Today"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-mono mt-0.5">{lead?.phone}</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatDate(item.date)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200/80 italic">
                      &ldquo;{item.reason}&rdquo;
                    </p>

                    {lead && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(lead)}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline px-3 py-1.5"
                        >
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartCall(lead)}
                          className="flex items-center gap-1 text-xs font-bold bg-emerald-600 text-white rounded-xl px-4 py-1.5 shadow-xs"
                        >
                          <Phone className="size-3.5 fill-white" /> Call Now
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 3: ALL MY LEADS DIRECTORY ── */}
        {activeTab === "leads" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>My Assigned Leads ({myAssignedLeads.length})</span>
            </div>

            {myAssignedLeads.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No leads currently assigned to you. Leads assigned from the manager panel will appear here.
              </div>
            ) : (
              myAssignedLeads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-bold text-sm text-slate-900 hover:text-indigo-600">
                        {lead.name}
                      </Link>
                      <p className="text-xs font-mono text-slate-500">{lead.phone} · {lead.city}</p>
                    </div>
                    <StageBadge value={lead.stage} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {lead.course} ({lead.country})
                    </span>
                    <SourceBadge value={lead.source} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(lead)}
                      className="text-xs font-bold text-emerald-700 px-2.5 py-1"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartCall(lead)}
                      className="flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white rounded-xl px-3 py-1.5 shadow-xs"
                    >
                      <Phone className="size-3.5 fill-white" /> Call
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 4: RECENT CALL LOGS ── */}
        {activeTab === "history" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>Calls Logged Today ({activeCalls.length})</span>
            </div>

            {activeCalls.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No calls recorded today yet. Use the dialer button to start logging!
              </div>
            ) : (
              activeCalls.map((c, i) => {
                const lead = leads.find((l) => l.id === c.leadId) || (leads.length > 0 ? leads[i % leads.length] : null);
                return (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{lead?.name || "Student"}</span>
                      <StatusBadge value={c.outcome} />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-mono">{c.duration}</span>
                      <span>·</span>
                      <span>{new Date(c.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {c.notes && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {c.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 5: MY TARGETS & PERFORMANCE ── */}
        {activeTab === "targets" && (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>Personal Monthly Performance</span>
                <span className="text-xs text-indigo-700 font-semibold">
                  {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
                </span>
              </h3>

              <div className="space-y-3">
                {targets.map((t) => {
                  const pct = t.target > 0 ? Math.min(100, Math.round((t.done / t.target) * 100)) : 0;
                  return (
                    <div key={t.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{t.label}</span>
                        <span className="text-slate-600">
                          {t.done} / {t.target} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-600" : "bg-amber-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Conversion Pace:</span>
                <span className="font-bold text-emerald-600">Top 10% in Team (+12%)</span>
              </div>
            </div>

            {/* Calling Scripts & Talking Points */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Quick Script Checklist
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Verify student NEET qualification score &amp; 12th PCB percentage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Highlight WHO, NMC recognized English-medium universities.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Explain 5-year budget including hostel, mess, and Indian food.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Schedule parent Zoom counselling or office consultation.</span>
                </li>
              </ul>
            </div>

            {/* Account & Session Sign Out Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                    {(callerName || "TC").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">{callerName}</p>
                    <p className="text-[11px] text-slate-500">{sessionUser?.email || "Counsellor"}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {presence}
                </span>
              </div>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="size-4" />
                <span>Sign Out of Lead.OS</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── NATIVE IN-CALL & LOGGING DRAWER / MODAL ── */}
      {activeCallLead && (
        <Dialog open={!!activeCallLead} onOpenChange={(open) => !open && handleCloseCallModal()}>
          <DialogContent className="max-w-md bg-white border border-slate-200 p-5 shadow-2xl rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-2">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="size-3 rounded-full bg-emerald-500 animate-ping" />
                  <span>Call in Progress</span>
                </DialogTitle>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-mono font-bold">
                  <span>{formatTimer(callTimer)}</span>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 pt-1">
              {/* Student Brief Card */}
              <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-indigo-950">{activeCallLead.name}</h3>
                    <p className="font-mono text-indigo-800 font-semibold">{activeCallLead.phone}</p>
                  </div>
                  <span className="text-[11px] font-bold bg-white text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200">
                    {activeCallLead.course} ({activeCallLead.country})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-indigo-900 font-medium">
                  {activeCallLead.neetScore && <span>NEET: <strong>{activeCallLead.neetScore}</strong></span>}
                  {activeCallLead.budget && <span>Budget: <strong>{activeCallLead.budget}</strong></span>}
                  {activeCallLead.parentName && <span>Parent: <strong>{activeCallLead.parentName}</strong></span>}
                </div>
              </div>

              {/* Call Outcome Buttons Grid (1-Tap Selection) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Select Call Outcome *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CALL_OUTCOMES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setCallOutcome(item.label)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer",
                        callOutcome === item.label
                          ? "ring-2 ring-indigo-600 bg-indigo-50 text-indigo-950 border-indigo-300"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Note Snippets */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  Quick Remark Chips (Tap to add):
                </label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar">
                  {QUICK_NOTES.map((snippet) => (
                    <button
                      key={snippet}
                      type="button"
                      onClick={() => {
                        setCallNotes((prev) => (prev ? `${prev}. ${snippet}` : snippet));
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 cursor-pointer"
                    >
                      + {snippet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Notes input */}
              <div>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Record specific student objections, discussion points, or parent remarks…"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400"
                />
              </div>

              {/* Follow-up Date (if Outcome requires callback) */}
              {(callOutcome === "Follow-up" || callOutcome === "Parent Discussion" || callOutcome === "Busy / Call Later") && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">
                      Schedule Callback Date *
                    </label>
                    <input
                      type="date"
                      value={scheduleFollowUpDate}
                      onChange={(e) => setScheduleFollowUpDate(e.target.value)}
                      className="w-full h-8 rounded-lg border border-amber-300 bg-white px-2 text-xs text-amber-950 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">
                      Callback Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Discuss fee with father"
                      value={followUpReason}
                      onChange={(e) => setFollowUpReason(e.target.value)}
                      className="w-full h-8 rounded-lg border border-amber-300 bg-white px-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Save & Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseCallModal}
                  className="border-slate-300 text-slate-700 text-xs cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAndNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md cursor-pointer flex-1"
                >
                  <Check className="size-4" />
                  Save &amp; Next Lead
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── WHATSAPP MESSAGE PREVIEW MODAL ── */}
      {whatsAppLead && (
        <Dialog open={!!whatsAppLead} onOpenChange={(open) => !open && setWhatsAppLead(null)}>
          <DialogContent className="max-w-md bg-white border border-slate-200 p-5 shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageCircle className="size-4 text-emerald-600" />
                <span>WhatsApp Message to {whatsAppLead.name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="text-xs text-slate-500 font-mono">
                Recipient: <strong className="text-slate-800">{whatsAppLead.phone}</strong>
              </div>

              <textarea
                rows={4}
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWhatsAppLead(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="size-3.5" />
                  Open in WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── NATIVE FIXED MOBILE BOTTOM APP BAR (PWA NAVIGATION) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 pb-safe shadow-lg md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {/* Tab 1: Queue / Dialer */}
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative",
              activeTab === "queue" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn("p-1 rounded-xl transition", activeTab === "queue" && "bg-indigo-50")}>
              <PhoneCall className="size-5" />
            </div>
            <span className="text-[10px] leading-tight">Dialer</span>
            {filteredQueue.length > 0 && (
              <span className="absolute top-2 right-4 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </button>

          {/* Tab 2: Follow-ups */}
          <button
            type="button"
            onClick={() => setActiveTab("followups")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative",
              activeTab === "followups" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn("p-1 rounded-xl transition", activeTab === "followups" && "bg-indigo-50")}>
              <CalendarClock className="size-5" />
            </div>
            <span className="text-[10px] leading-tight">Follow-ups</span>
            {activeFollowUps.length > 0 && (
              <span className="absolute top-2 right-4 text-[9px] font-black bg-amber-500 text-white px-1.5 rounded-full ring-2 ring-white">
                {activeFollowUps.length}
              </span>
            )}
          </button>

          {/* Tab 3: My Leads */}
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "leads" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn("p-1 rounded-xl transition", activeTab === "leads" && "bg-indigo-50")}>
              <Users className="size-5" />
            </div>
            <span className="text-[10px] leading-tight">Leads</span>
          </button>

          {/* Tab 4: Call History */}
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "history" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn("p-1 rounded-xl transition", activeTab === "history" && "bg-indigo-50")}>
              <FileText className="size-5" />
            </div>
            <span className="text-[10px] leading-tight">Logs</span>
          </button>

          {/* Tab 5: Targets & Performance */}
          <button
            type="button"
            onClick={() => setActiveTab("targets")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "targets" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn("p-1 rounded-xl transition", activeTab === "targets" && "bg-indigo-50")}>
              <Target className="size-5" />
            </div>
            <span className="text-[10px] leading-tight">Targets</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
