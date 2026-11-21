"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader, Panel } from "@/components/shared/page";
import { PrimaryButton, Modal, Field, inputClass, selectClass } from "@/components/modals/modal";
import { StatusBadge } from "@/components/shared/badges";
import { ProgressBar } from "@/components/charts/funnel";
import {
  getAssignmentRules,
  getLeads,
  getTelecallers,
  bulkAssignLeads,
  createAssignmentRule,
  store,
} from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { cn } from "@/lib/utils";

export default function AssignmentPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();

  const rules = getAssignmentRules();
  const telecallers = getTelecallers(branch);
  const unassigned = getLeads(branch).filter((l) => !l.assignedTo);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(rules.map((r) => [r.id, r.enabled])),
  );
  const [strategy, setStrategy] = useState("Round Robin");
  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("Round Robin");
  const [ruleScope, setRuleScope] = useState("Meta Ads Leads");

  const preview = unassigned.slice(0, 6).map((lead, i) => ({
    lead,
    owner:
      telecallers.length === 0
        ? null
        : strategy === "Round Robin"
          ? telecallers[i % telecallers.length]
          : strategy === "Least Assigned"
            ? [...telecallers].sort((a, b) => a.assigned - b.assigned)[0]
            : strategy === "Source Based"
              ? telecallers[lead.source === "Meta Ads" ? 0 : 2] ?? telecallers[0]
              : telecallers.find((t) => t.team.startsWith(lead.city)) ?? telecallers[0],
  }));

  const handleApplyStrategy = () => {
    if (telecallers.length === 0) {
      toast.error("No team members available. Please add team members in the Team section first.");
      return;
    }
    if (unassigned.length === 0) {
      toast.info("No unassigned leads in queue to distribute");
      return;
    }

    let assignedCount = 0;
    unassigned.forEach((lead, i) => {
      let targetOwner = telecallers[0];
      if (strategy === "Round Robin") {
        targetOwner = telecallers[i % telecallers.length] || telecallers[0];
      } else if (strategy === "Least Assigned") {
        targetOwner = [...telecallers].sort((a, b) => a.assigned - b.assigned)[0] || telecallers[0];
      } else if (strategy === "Source Based") {
        targetOwner = telecallers[lead.source === "Meta Ads" ? 0 : 2] || telecallers[0];
      } else {
        targetOwner = telecallers.find((t) => t.team.startsWith(lead.city)) || telecallers[0];
      }

      if (targetOwner) {
        bulkAssignLeads([lead.id], targetOwner.id);
        assignedCount++;
      }
    });

    toast.success(`Successfully assigned ${assignedCount} leads via ${strategy}!`);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    const created = createAssignmentRule({
      name: ruleName.trim(),
      type: ruleType,
      scope: ruleScope,
    });

    setEnabled((prev) => ({ ...prev, [created.id]: true }));
    toast.success(`Assignment rule "${created.name}" created and activated`);
    setAddRuleModalOpen(false);
    setRuleName("");
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Lead Assignment`}
        subtitle={`Decide how incoming ${branch === "masters" ? "Masters" : "MBBS"} leads reach your ${branch === "masters" ? "Masters" : "MBBS"} telecallers.`}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Assignment rules" className="xl:col-span-2" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.type} · {r.scope}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge value={enabled[r.id] ? "Active" : "Paused"} />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled[r.id]}
                    aria-label={`Toggle ${r.name}`}
                    onClick={() => {
                      setEnabled((e) => ({ ...e, [r.id]: !e[r.id] }));
                      toast.success(`${r.name} ${enabled[r.id] ? "paused" : "enabled"}`);
                    }}
                    className={cn(
                      "h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer",
                      enabled[r.id] ? "bg-primary" : "bg-surface-2 border border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "block size-4 rounded-full bg-card shadow transition-transform",
                        enabled[r.id] && "translate-x-4",
                      )}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-4">
            <PrimaryButton tone="brand" onClick={() => setAddRuleModalOpen(true)}>
              <Plus className="size-4" /> Add Rule
            </PrimaryButton>
          </div>
        </Panel>

        <Panel title="Team workload">
          <div className="space-y-4">
            {telecallers.map((t) => (
              <ProgressBar key={t.id} label={`${t.name} · ${t.assigned} active`} done={t.assigned} target={140} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Simulate assignment"
        description={`${unassigned.length} leads currently unassigned`}
        actions={
          <select
            aria-label="Assignment strategy"
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            {["Round Robin", "Least Assigned", "Source Based", "Location Based"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        }
        bodyClassName="p-0"
      >
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              {["Lead", "City", "Source", "Would be assigned to"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.map(({ lead, owner }) => (
              <tr key={lead.id}>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/leads/${lead.id}`} className="hover:text-primary hover:underline">
                    {lead.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{lead.city}</td>
                <td className="px-4 py-2.5">{lead.source}</td>
                <td className="px-4 py-2.5 font-semibold text-amber-700">{owner?.name ?? "Yet to Assign"}</td>
              </tr>
            ))}
            {preview.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-xs text-muted-foreground">
                  No unassigned leads pending in queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-border p-4">
          <PrimaryButton
            tone="brand"
            disabled={unassigned.length === 0}
            onClick={handleApplyStrategy}
          >
            Apply {strategy} to Queue ({unassigned.length} leads)
          </PrimaryButton>
        </div>
      </Panel>

      {/* Add Rule Modal */}
      <Modal
        open={addRuleModalOpen}
        onClose={() => setAddRuleModalOpen(false)}
        title="Add Assignment Rule"
        description="Configure automated routing logic for incoming prospective student enquiries."
        footer={
          <>
            <PrimaryButton tone="ghost" onClick={() => setAddRuleModalOpen(false)}>
              Cancel
            </PrimaryButton>
            <PrimaryButton onClick={handleCreateRule}>
              Save & Activate Rule
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Field label="Rule Name *">
            <input
              type="text"
              required
              className={inputClass}
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Meta Ads Round-Robin Hyderabad"
            />
          </Field>

          <Field label="Routing Strategy">
            <select
              className={selectClass}
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value)}
            >
              <option value="Round Robin">Round Robin</option>
              <option value="Least Assigned">Least Assigned (Workload Balance)</option>
              <option value="Source Based">Source Based</option>
              <option value="Location Match">Location / Branch Match</option>
            </select>
          </Field>

          <Field label="Lead Scope">
            <select
              className={selectClass}
              value={ruleScope}
              onChange={(e) => setRuleScope(e.target.value)}
            >
              <option value="Meta Ads Leads">Meta Ads Enquiries</option>
              <option value="Google Ads Leads">Google Search Ads</option>
              <option value="Website Direct">Direct Website Submissions</option>
              <option value="WhatsApp Direct">WhatsApp Enquiries</option>
              <option value="All Incoming Leads">All Incoming Leads</option>
            </select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
