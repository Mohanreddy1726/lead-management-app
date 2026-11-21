"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  User,
  PhoneCall,
  Headphones,
  FileText,
  MessageSquare,
  Bell,
  Volume2,
  Sliders,
  Save,
  RotateCcw,
  Check,
  Copy,
  Plus,
  Trash2,
  Sparkles,
  Laptop,
  Mic,
  ShieldCheck,
  Clock,
  Send,
  HelpCircle,
  Smartphone,
  Radio,
  BookOpen,
} from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { StatusBadge } from "@/components/shared/badges";
import { getCallScripts } from "@/services/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "dialer" | "scripts" | "snippets" | "notifications" | "workspace"
  >("profile");

  // 1. Counsellor Profile State
  const [counsellorName, setCounsellorName] = useState("Vennela Kondapalli");
  const [counsellorRole, setCounsellorRole] = useState("Senior Admissions Manager");
  const [counsellorTeam, setCounsellorTeam] = useState("Hyderabad Central Team");
  const [counsellorPhone, setCounsellorPhone] = useState("+91 98480 21248");
  const [counsellorEmail, setCounsellorEmail] = useState("vennela@gvkoverseas.com");
  const [whatsappSignature, setWhatsappSignature] = useState(
    "Regards,\nVennela Kondapalli\nSenior Overseas Admissions Counsellor\nGVK Education Consultancy · +91 98480 21248",
  );
  const [dailyCallGoal, setDailyCallGoal] = useState(40);
  const [dailyAdmissionGoal, setDailyAdmissionGoal] = useState(2);

  // 2. Calling & Dialer Preferences
  const [callingMode, setCallingMode] = useState<"webrtc" | "mobile" | "sim">("webrtc");
  const [autoRecordCalls, setAutoRecordCalls] = useState(true);
  const [wrapUpTimer, setWrapUpTimer] = useState<"30" | "60" | "off">("30");
  const [autoOpenScript, setAutoOpenScript] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [selectedMicrophone, setSelectedMicrophone] = useState("Headset Microphone (Jabra Evolve 20)");

  // 3. Call Scripts & Playbooks
  const [scripts, setScripts] = useState(getCallScripts());
  const [activeScriptId, setActiveScriptId] = useState(scripts[0]?.id || "cs1");
  const [newStepText, setNewStepText] = useState("");

  const currentScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];

  const handleAddScriptStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;
    setScripts((prev) =>
      prev.map((s) =>
        s.id === activeScriptId ? { ...s, steps: [...s.steps, newStepText.trim()] } : s,
      ),
    );
    setNewStepText("");
    toast.success("Script checkpoint step added");
  };

  const handleRemoveStep = (stepIndex: number) => {
    setScripts((prev) =>
      prev.map((s) =>
        s.id === activeScriptId
          ? { ...s, steps: s.steps.filter((_, i) => i !== stepIndex) }
          : s,
      ),
    );
    toast.success("Step removed from script");
  };

  // 4. Quick WhatsApp / SMS Snippets
  const [snippets, setSnippets] = useState([
    {
      id: "snip-1",
      title: "MBBS Kazakhstan Fee & Hostel Overview",
      tags: ["Kazakhstan", "Fees"],
      body: "Hello! As discussed, here is the official fee structure for Semey State Medical University (Kazakhstan): Tuition fee is $3,800/yr and Indian hostel with mess is $800/yr. Total 5-year budget is ~₹22-25 Lakhs all-inclusive. You can view the full prospectus here: https://gvkoverseas.com/semey-brochure. Let me know when you and your parents can connect!",
    },
    {
      id: "snip-2",
      title: "Document Checklist for NEET Qualifiers",
      tags: ["Documents", "Application"],
      body: "Dear Student, to process your university provisional admission letter, please keep digital scans of: 1) 10th & 12th Marks Cards, 2) NEET Scorecard, 3) Valid Passport (first & last page), 4) 6 Passport Photos (white background). Once ready, reply here or upload to your student portal.",
    },
    {
      id: "snip-3",
      title: "Counselling Appointment Confirmation",
      tags: ["Appointment", "Schedule"],
      body: "Hi! Your 1-on-1 overseas medical counselling session with our Senior Counsellor has been scheduled for today at 3:30 PM. We will review country comparisons (Kazakhstan vs Georgia vs Germany) and MCI/NMC 2021 gazette compliance. Google Meet link: https://meet.google.com/gvk-couns",
    },
    {
      id: "snip-4",
      title: "Post-Call Summary & Next Step Reminder",
      tags: ["Follow-up"],
      body: "Thank you for speaking with me today. Summary of our discussion: We shortlisted Astana Medical University and Tbilisi State. Next step: Please discuss the total fee comparison with your family tonight. I will follow up with you tomorrow at 11:30 AM as agreed. Have a great day!",
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Snippet copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 5. Sound & Notification Alerts
  const [chimeOnNewLead, setChimeOnNewLead] = useState(true);
  const [alertOnOverdueFollowUp, setAlertOnOverdueFollowUp] = useState(true);
  const [desktopPush, setDesktopPush] = useState(true);
  const [dailyWhatsAppBriefing, setDailyWhatsAppBriefing] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(80);

  const testAudioChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(volumeLevel / 100 * 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      toast.success("Sound test played successfully");
    } catch {
      toast.success("Audio notification test triggered");
    }
  };

  // 6. Workspace & Display Preferences
  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">("comfortable");
  const [defaultStartPage, setDefaultStartPage] = useState<string>("/dashboard");
  const [highlightHighScores, setHighlightHighScores] = useState(true);
  const [showCallTimerOnScreen, setShowCallTimerOnScreen] = useState(true);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Workstation and calling preferences saved!");
  };

  const handleResetDefaults = () => {
    setDailyCallGoal(40);
    setCallingMode("webrtc");
    setAutoRecordCalls(true);
    setWrapUpTimer("30");
    setTableDensity("comfortable");
    toast.info("Preferences restored to recommended defaults");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Page Header */}
      <PageHeader
        title="Settings & Workstation Preferences"
        subtitle="Configure your dialer setup, call scripts, quick response templates, audio alerts, and counselling tools."
        actions={
          <div className="flex items-center gap-2">
            <PrimaryButton tone="ghost" onClick={handleResetDefaults}>
              <RotateCcw className="size-3.5 mr-1" />
              Reset Defaults
            </PrimaryButton>
            <PrimaryButton onClick={handleSaveAll}>
              <Save className="size-3.5 mr-1" />
              Save Preferences
            </PrimaryButton>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px overflow-x-auto">
        {[
          { id: "profile", label: "My Counsellor Profile", icon: User },
          { id: "dialer", label: "Calling & Dialer", icon: PhoneCall },
          { id: "scripts", label: "Call Scripts & Objections", icon: BookOpen },
          { id: "snippets", label: "WhatsApp & SMS Snippets", icon: MessageSquare },
          { id: "notifications", label: "Sound & Alert Chimes", icon: Volume2 },
          { id: "workspace", label: "Workspace & Display", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2",
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Counsellor Profile */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveAll} className="space-y-5">
          <Panel
            title="Counsellor Identity & Outreach Card"
            description="Your personal information shown to students on WhatsApp brochures, callback confirmations, and the team dashboard"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={counsellorName}
                  onChange={(e) => setCounsellorName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Designation / Role Title</label>
                <input
                  type="text"
                  value={counsellorRole}
                  onChange={(e) => setCounsellorRole(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Direct Telecalling Line</label>
                <input
                  type="tel"
                  value={counsellorPhone}
                  onChange={(e) => setCounsellorPhone(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Work Email Address</label>
                <input
                  type="email"
                  value={counsellorEmail}
                  onChange={(e) => setCounsellorEmail(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Assigned Operational Team</label>
                <input
                  type="text"
                  value={counsellorTeam}
                  disabled
                  className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-xs text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Daily Outbound Call Goal</label>
                <input
                  type="number"
                  min={10}
                  max={150}
                  value={dailyCallGoal}
                  onChange={(e) => setDailyCallGoal(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-foreground">Default WhatsApp / SMS Outgoing Signature</label>
              <textarea
                rows={3}
                value={whatsappSignature}
                onChange={(e) => setWhatsappSignature(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Appended automatically to quick message templates sent from the student drawer.
              </p>
            </div>
          </Panel>
        </form>
      )}

      {/* Tab 2: Calling & Dialer Preferences */}
      {activeTab === "dialer" && (
        <div className="space-y-5">
          <Panel
            title="Telephony & Outbound Dialer Mode"
            description="Choose how outgoing calls to students and parents are initiated"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  id: "webrtc",
                  title: "Web Phone (WebRTC)",
                  desc: "Place calls directly inside browser using your computer headset. Zero mobile phone needed.",
                  badge: "Recommended",
                  icon: Headphones,
                },
                {
                  id: "mobile",
                  title: "Mobile Bridge Call",
                  desc: "System rings your mobile first, then connects outbound to student. Uses office caller ID.",
                  badge: "Office IVR",
                  icon: Smartphone,
                },
                {
                  id: "sim",
                  title: "Direct SIM Click-to-Call",
                  desc: "Sends contact directly to your phone's dialer app via tel: link.",
                  badge: "Standard",
                  icon: PhoneCall,
                },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = callingMode === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => setCallingMode(mode.id as any)}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all space-y-2.5 flex flex-col justify-between",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                        : "border-border bg-card hover:bg-surface-2",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={cn("size-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}>
                          {mode.badge}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-foreground">{mode.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{mode.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground">{isSelected ? "Active Mode" : "Select"}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Audio Devices & Call Logging Workflow" description="Hardware and post-call automation preferences">
            <div className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Microphone Input</label>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Microphone Input Device"
                    value={selectedMicrophone}
                    onChange={(e) => setSelectedMicrophone(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option>Headset Microphone (Jabra Evolve 20)</option>
                    <option>Internal Laptop Microphone (Realtek Audio)</option>
                    <option>Default System Microphone</option>
                  </select>
                  <PrimaryButton tone="ghost" type="button" onClick={() => toast.success("Microphone test: Mic input volume level 88%")}>
                    <Mic className="size-3.5 mr-1" />
                    Test Mic
                  </PrimaryButton>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">Automatic Call Recording</p>
                  <p className="text-[11px] text-muted-foreground">Store audio recordings in student timeline for training and audit review</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRecordCalls}
                  onChange={(e) => setAutoRecordCalls(e.target.checked)}
                  className="size-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">Auto-Open Calling Script</p>
                  <p className="text-[11px] text-muted-foreground">Pop up checklist script as soon as the call connects</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoOpenScript}
                  onChange={(e) => setAutoOpenScript(e.target.checked)}
                  className="size-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Post-Call Wrap-up Buffer Timer</label>
                <select
                  aria-label="Post-Call Wrap-up Timer"
                  value={wrapUpTimer}
                  onChange={(e) => setWrapUpTimer(e.target.value as any)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="30">30 Seconds (Recommended)</option>
                  <option value="60">60 Seconds</option>
                  <option value="off">Off (Manual disposition)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Holds your queue for 30s after hanging up to let you log outcome and notes without interruptions.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* Tab 3: Call Scripts & Playbooks */}
      {activeTab === "scripts" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="Call Script Checklists" description="Select and review conversation flows" className="xl:col-span-1" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {scripts.map((s) => (
                <li
                  key={s.id}
                  onClick={() => setActiveScriptId(s.id)}
                  className={cn(
                    "p-3.5 cursor-pointer transition-colors space-y-1",
                    activeScriptId === s.id ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-accent/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{s.title}</span>
                    <span className="text-[10px] text-muted-foreground bg-surface-2 border border-border rounded px-1.5 py-0.5">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{s.steps.length} checklist steps</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title={currentScript?.title || "Script Steps"}
            description={`Sequential conversational checkpoints used during ${currentScript?.category}`}
            className="xl:col-span-2"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                {currentScript?.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="text-foreground font-medium">{step}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 transition"
                      title="Remove step"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Step Form */}
              <form onSubmit={handleAddScriptStep} className="flex gap-2 pt-2 border-t border-border">
                <input
                  type="text"
                  placeholder="Add custom talking point or qualification question..."
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <PrimaryButton type="submit">
                  <Plus className="size-3.5 mr-1" />
                  Add Step
                </PrimaryButton>
              </form>

              {/* Objection Handling Cheat Sheet */}
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="size-4" />
                  Quick Objection Cheat Sheet (Instant Rebuttals)
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded bg-card/80 p-2 border border-border/60">
                    <p className="font-semibold text-foreground">&quot;Is Kazakhstan or Georgia recognized by NMC / NEXT?&quot;</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Rebuttal: Yes, universities follow the NMC Gazette 2021 (54-month English medium course + 12-month clinical internship + local medical license registration).
                    </p>
                  </div>
                  <div className="rounded bg-card/80 p-2 border border-border/60">
                    <p className="font-semibold text-foreground">&quot;What if NEET score is below 250?&quot;</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Rebuttal: Qualifying cutoff is all that NMC mandates (typically 137+ for General, 107+ for Reserved). Admission is merit-based on Class 12 PCB scores.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* Tab 4: WhatsApp & SMS Snippets */}
      {activeTab === "snippets" && (
        <div className="space-y-4">
          <Panel
            title="Pre-approved WhatsApp & SMS Quick Replies"
            description="One-click canned messages for brochures, fee breakdowns, and next steps"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {snippets.map((snip) => (
                <div
                  key={snip.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-foreground">{snip.title}</h4>
                      <div className="flex gap-1">
                        {snip.tags.map((t) => (
                          <span key={t} className="rounded bg-surface-2 border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-surface-2/60 p-2.5 rounded-lg border border-border/60 whitespace-pre-wrap">
                      {snip.body}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Click to copy with your signature</span>
                    <PrimaryButton
                      tone={copiedId === snip.id ? "primary" : "ghost"}
                      onClick={() => handleCopySnippet(snip.id, `${snip.body}\n\n${whatsappSignature}`)}
                    >
                      {copiedId === snip.id ? (
                        <>
                          <Check className="size-3.5 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 mr-1" />
                          Copy Template
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Tab 5: Sound & Notification Alerts */}
      {activeTab === "notifications" && (
        <Panel
          title="Audio Chimes & Urgent Follow-up Alarms"
          description="Sound effects and push alerts to ensure zero delayed leads"
        >
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Play Chime on New Lead Assignment</p>
                <p className="text-[11px] text-muted-foreground">Plays high-pitch double chime when manager or round-robin assigns a student</p>
              </div>
              <input
                type="checkbox"
                checked={chimeOnNewLead}
                onChange={(e) => setChimeOnNewLead(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Overdue Follow-up Urgent Siren</p>
                <p className="text-[11px] text-muted-foreground">Alerts when a scheduled follow-up is pending for over 15 minutes</p>
              </div>
              <input
                type="checkbox"
                checked={alertOnOverdueFollowUp}
                onChange={(e) => setAlertOnOverdueFollowUp(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Desktop Browser Push Notifications</p>
                <p className="text-[11px] text-muted-foreground">Show alerts even when Lead.OS tab is in background</p>
              </div>
              <input
                type="checkbox"
                checked={desktopPush}
                onChange={(e) => setDesktopPush(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">9:00 AM Daily WhatsApp Briefing</p>
                <p className="text-[11px] text-muted-foreground">Receive daily schedule of follow-ups and counselling calls via WhatsApp bot</p>
              </div>
              <input
                type="checkbox"
                checked={dailyWhatsAppBriefing}
                onChange={(e) => setDailyWhatsAppBriefing(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Volume2 className="size-4 text-primary" />
                  Alert Chime Volume: {volumeLevel}%
                </span>
                <PrimaryButton tone="ghost" type="button" onClick={testAudioChime}>
                  <Volume2 className="size-3.5 mr-1" />
                  Test Audio
                </PrimaryButton>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={volumeLevel}
                onChange={(e) => setVolumeLevel(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>
        </Panel>
      )}

      {/* Tab 6: Workspace & Display */}
      {activeTab === "workspace" && (
        <Panel
          title="Workspace Customization & Table Density"
          description="Tailor layout and density to suit your screen size and daily workflow"
        >
          <div className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Lead Table Row Density</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTableDensity("comfortable")}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition cursor-pointer space-y-1",
                    tableDensity === "comfortable"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:bg-surface-2",
                  )}
                >
                  <p className="font-semibold text-xs text-foreground">Comfortable</p>
                  <p className="text-[11px] text-muted-foreground">Standard spacing with large badges and quick actions</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTableDensity("compact")}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition cursor-pointer space-y-1",
                    tableDensity === "compact"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:bg-surface-2",
                  )}
                >
                  <p className="font-semibold text-xs text-foreground">Compact Mode</p>
                  <p className="text-[11px] text-muted-foreground">Show 40% more student records per page</p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Default Landing Page on Login</label>
              <select
                aria-label="Default Landing Page"
                value={defaultStartPage}
                onChange={(e) => setDefaultStartPage(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="/dashboard">Team Dashboard (/dashboard)</option>
                <option value="/leads">All Leads Table (/leads)</option>
                <option value="/follow-ups">Today&apos;s Follow-ups Queue (/follow-ups)</option>
                <option value="/calls">Call Logs & Telephony (/calls)</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Highlight High-Propensity Leads (&gt;75 Score)</p>
                <p className="text-[11px] text-muted-foreground">Add subtle green glow to top-scored student rows in tables</p>
              </div>
              <input
                type="checkbox"
                checked={highlightHighScores}
                onChange={(e) => setHighlightHighScores(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">Show Call Timer Floating Widget</p>
                <p className="text-[11px] text-muted-foreground">Keep an active talk-time counter pinned during student conversations</p>
              </div>
              <input
                type="checkbox"
                checked={showCallTimerOnScreen}
                onChange={(e) => setShowCallTimerOnScreen(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
