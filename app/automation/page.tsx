"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Settings,
  AlertTriangle,
  History,
  Activity,
} from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { StatusBadge } from "@/components/shared/badges";
import { getAutomationRules } from "@/services/api";
import { cn } from "@/lib/utils";

export default function AutomationPage() {
  const [rules, setRules] = useState(getAutomationRules());
  const [showModal, setShowModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleWhen, setNewRuleWhen] = useState("");
  const [newRuleThen, setNewRuleThen] = useState("");

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalRuns = rules.reduce((acc, r) => acc + r.runs, 0);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const next = !r.enabled;
          toast.success(`${r.name} is now ${next ? "active" : "paused"}`);
          return { ...r, enabled: next };
        }
        return r;
      }),
    );
  };

  const handleTestRun = (ruleName: string) => {
    toast.success(`Test execution succeeded for "${ruleName}". Trigger condition matched sample lead.`);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleWhen.trim() || !newRuleThen.trim()) {
      toast.error("Please fill in all rule fields");
      return;
    }
    const newRule = {
      id: `ar-${Date.now().toString().slice(-4)}`,
      name: newRuleName.trim(),
      when: newRuleWhen.trim(),
      then: newRuleThen.split(",").map((s) => s.trim()),
      enabled: true,
      runs: 0,
    };
    setRules([newRule, ...rules]);
    setShowModal(false);
    setNewRuleName("");
    setNewRuleWhen("");
    setNewRuleThen("");
    toast.success("New automation rule created and activated!");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* Header */}
      <PageHeader
        title="Workflow Automation"
        subtitle="Rule-based trigger workflows: automated notifications, follow-up generators, and intake escalations."
        actions={
          <PrimaryButton onClick={() => setShowModal(true)}>
            <Plus className="size-3.5 mr-1" />
            New Rule
          </PrimaryButton>
        }
      />

      {/* Top Level KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active Automations" value={activeCount} tone="text-success" />
        <StatTile label="Total Executions" value={totalRuns.toLocaleString()} tone="text-primary" />
        <StatTile label="Success Rate" value="99.8%" tone="text-emerald-600" />
        <StatTile label="Estimated Hours Saved" value="38 hrs/mo" tone="text-foreground" />
      </div>

      {/* Rules List Panel */}
      <Panel
        title="Active Automation Rules"
        description="Event listeners constantly monitoring lead status changes and counsellor deadlines"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {rules.map((rule) => (
            <li key={rule.id} className="p-5 space-y-3 transition-colors hover:bg-accent/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center border",
                    rule.enabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-muted border-border text-muted-foreground",
                  )}>
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{rule.runs} lifetime executions</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge value={rule.enabled ? "Active" : "Paused"} />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    aria-label={`Toggle ${rule.name}`}
                    onClick={() => toggleRule(rule.id)}
                    className={cn(
                      "h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer",
                      rule.enabled ? "bg-primary" : "border border-border bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "block size-4 rounded-full bg-card shadow transition-transform",
                        rule.enabled && "translate-x-4",
                      )}
                    />
                  </button>

                  <PrimaryButton tone="ghost" onClick={() => handleTestRun(rule.name)}>
                    <Play className="size-3 mr-1" />
                    Test
                  </PrimaryButton>
                </div>
              </div>

              {/* Trigger & Actions Sequence */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-indigo-600 uppercase tracking-wide text-[10px] shrink-0 mt-0.5">
                    WHEN:
                  </span>
                  <span className="text-foreground font-mono text-[11px]">{rule.when}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-border/60">
                  <span className="font-semibold text-emerald-600 uppercase tracking-wide text-[10px] shrink-0 mt-0.5">
                    THEN:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap text-foreground">
                    {rule.then.map((action, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded bg-card px-2 py-0.5 border border-border font-medium text-[11px]">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Template Recipes */}
      <Panel title="Recommended Automation Templates" description="Turnkey workflows ready to activate in one click">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="size-4 text-primary" />
                Instant WhatsApp Welcome
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a new Meta lead is captured, automatically dispatch university brochure and intake details via WhatsApp.
              </p>
            </div>
            <PrimaryButton
              tone="outline"
              onClick={() => {
                setRules((prev) => [
                  {
                    id: `ar-${Date.now().toString().slice(-4)}`,
                    name: "Instant WhatsApp Welcome",
                    when: "Lead Source = Meta Ads AND Stage = New",
                    then: ["Send WhatsApp Brochure", "Assign Round Robin"],
                    enabled: true,
                    runs: 0,
                  },
                  ...prev,
                ]);
                toast.success("Added template: Instant WhatsApp Welcome");
              }}
            >
              Use Template
            </PrimaryButton>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Clock className="size-4 text-amber-500" />
                24-Hour SLA Escalation
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If a lead remains in &quot;Assigned&quot; without any call logged for 24 hours, escalate to Manager and reassign.
              </p>
            </div>
            <PrimaryButton
              tone="outline"
              onClick={() => {
                setRules((prev) => [
                  {
                    id: `ar-${Date.now().toString().slice(-4)}`,
                    name: "24-Hour SLA Escalation",
                    when: "Lead in Assigned for > 24 Hours with 0 Calls",
                    then: ["Reassign Lead", "Alert Manager VK"],
                    enabled: true,
                    runs: 0,
                  },
                  ...prev,
                ]);
                toast.success("Added template: 24-Hour SLA Escalation");
              }}
            >
              Use Template
            </PrimaryButton>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Activity className="size-4 text-emerald-500" />
                Offer Letter SMS to Parents
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When university stage transitions to &quot;Offer Received&quot;, notify student and parent with admission next steps.
              </p>
            </div>
            <PrimaryButton
              tone="outline"
              onClick={() => {
                setRules((prev) => [
                  {
                    id: `ar-${Date.now().toString().slice(-4)}`,
                    name: "Offer Letter Notification",
                    when: "Application Stage = Offer Received",
                    then: ["Send SMS to Parent", "Create Fee Follow-up"],
                    enabled: true,
                    runs: 0,
                  },
                  ...prev,
                ]);
                toast.success("Added template: Offer Letter Notification");
              }}
            >
              Use Template
            </PrimaryButton>
          </div>
        </div>
      </Panel>

      {/* New Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Create Automation Rule</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Documentation Completed Alert"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">When (Trigger Condition)</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Stage = Documentation AND Documents Verified = 9"
                  value={newRuleWhen}
                  onChange={(e) => setNewRuleWhen(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Then (Actions, comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule Visa Appointment, Notify Manager"
                  value={newRuleThen}
                  onChange={(e) => setNewRuleThen(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <PrimaryButton tone="ghost" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </PrimaryButton>
                <PrimaryButton tone="primary" type="submit">
                  Activate Rule
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
