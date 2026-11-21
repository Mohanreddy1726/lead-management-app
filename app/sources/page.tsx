"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader, Panel } from "@/components/shared/page";
import { PrimaryButton, Modal, Field, inputClass } from "@/components/modals/modal";
import { BarRow } from "@/components/charts/funnel";
import { StatusBadge } from "@/components/shared/badges";
import { getSources, createSource, store } from "@/services/api";
import { useBranch } from "@/context/BranchContext";
import { cn } from "@/lib/utils";

export default function SourcesPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();

  const sources = getSources(branch);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(sources.map((s) => [s.name, true])),
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");

  const max = Math.max(...sources.map((s) => s.leads), 1);

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) {
      toast.error("Please enter a source name");
      return;
    }

    createSource(newSourceName.trim());
    setEnabled((prev) => ({ ...prev, [newSourceName.trim()]: true }));
    toast.success(`Source "${newSourceName.trim()}" added to channel tracking`);
    setAddModalOpen(false);
    setNewSourceName("");
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Lead Sources`}
        subtitle={`Enable, disable and compare channels feeding your ${branch === "masters" ? "Masters" : "MBBS"} admissions pipeline.`}
        actions={
          <PrimaryButton tone="brand" onClick={() => setAddModalOpen(true)}>
            <Plus className="size-4" /> Add Source
          </PrimaryButton>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Volume by source">
          <div className="space-y-4">
            {sources.map((s) => (
              <BarRow key={s.name} label={s.name} value={s.leads} max={max} sub={`${s.admissions} admissions`} />
            ))}
          </div>
        </Panel>

        <Panel title="Conversion by source" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Source", "Leads", "Contacted", "Interested", "Applications", "Admissions"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((s) => (
                  <tr key={s.name} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2.5 text-numeric">{s.leads}</td>
                    <td className="px-3 py-2.5 text-numeric">{s.contacted}</td>
                    <td className="px-3 py-2.5 text-numeric">{s.interested}</td>
                    <td className="px-3 py-2.5 text-numeric">{s.applications}</td>
                    <td className="px-3 py-2.5 text-numeric font-bold text-emerald-600">{s.admissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Source settings & status" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {sources.map((s) => (
            <li key={s.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.leads} leads captured to date</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={enabled[s.name] ? "Active" : "Paused"} />
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled[s.name]}
                  aria-label={`Toggle ${s.name}`}
                  onClick={() => {
                    setEnabled((e) => ({ ...e, [s.name]: !e[s.name] }));
                    toast.success(`${s.name} ${enabled[s.name] ? "disabled" : "enabled"}`);
                  }}
                  className={cn(
                    "h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer",
                    enabled[s.name] ? "bg-primary" : "border border-border bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "block size-4 rounded-full bg-card shadow transition-transform",
                      enabled[s.name] && "translate-x-4",
                    )}
                  />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Add Source Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Lead Source"
        description="Register a new channel or marketing intake stream."
        footer={
          <>
            <PrimaryButton tone="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </PrimaryButton>
            <PrimaryButton onClick={handleAddSource}>
              Save Source
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleAddSource} className="space-y-4">
          <Field label="Source Name *">
            <input
              type="text"
              required
              className={inputClass}
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="e.g. Education Expo Hyderabad 2026"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
