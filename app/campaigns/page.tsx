"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Megaphone } from "lucide-react";
import { PageHeader, Panel, StatTile } from "@/components/shared/page";
import { FunnelChart } from "@/components/charts/funnel";
import { SourceBadge, StatusBadge } from "@/components/shared/badges";
import { PrimaryButton, Modal, Field, inputClass, selectClass } from "@/components/modals/modal";
import {
  formatDate,
  formatINR,
  getCampaigns,
  getLeads,
  createCampaign,
  store,
} from "@/services/api";
import { SOURCES } from "@/data/mock";
import type { LeadSource } from "@/data/types";
import { useBranch } from "@/context/BranchContext";

export default function CampaignsPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const campaigns = getCampaigns(branch);
  const [activeId, setActiveId] = useState(campaigns[0]?.id || "");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (campaigns.length > 0 && !campaigns.some((c) => c.id === activeId)) {
      setActiveId(campaigns[0]?.id || "");
    }
  }, [branch, campaigns, activeId]);

  // New Campaign Form State
  const [name, setName] = useState("");
  const [source, setSource] = useState<LeadSource>(branch === "masters" ? "Meta Ads" : "Meta Ads");
  const [budget, setBudget] = useState("150000");
  const [startDate, setStartDate] = useState("2026-10-21");
  const [endDate, setEndDate] = useState("2026-11-20");

  const active = campaigns.find((c) => c.id === activeId) || campaigns[0];
  const campaignLeads = active ? getLeads(branch).filter((l) => l.campaignId === active.id) : [];

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    const created = createCampaign({
      name: name.trim(),
      source,
      branch,
      budget: parseFloat(budget) || 100000,
      startDate,
      endDate,
      status: "Active",
    });

    toast.success(`Campaign "${created.name}" created in ${branch.toUpperCase()} division`);
    setActiveId(created.id);
    setCreateModalOpen(false);
    setName("");
  };

  if (!active) {
    return (
      <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
        <PageHeader
          title="Campaigns"
          subtitle="Marketing spend connected to real admissions."
          actions={
            <PrimaryButton tone="brand" onClick={() => setCreateModalOpen(true)}>
              <Plus className="size-4" /> Create Campaign
            </PrimaryButton>
          }
        />
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          No campaigns found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad (Meta Ads Account)" : "MBBS Abroad"} Campaigns`}
        subtitle={`Marketing spend connected to real ${branch === "masters" ? "Masters" : "MBBS"} admissions and lead pipeline.`}
        actions={
          <PrimaryButton tone="brand" onClick={() => setCreateModalOpen(true)}>
            <Plus className="size-4" /> Create Campaign
          </PrimaryButton>
        }
      />

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
            <tr>
              {["Campaign", "Source", "Status", "Dates", "Budget", "Leads", "Applications", "Admissions", "Revenue"].map(
                (h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((c) => (
              <tr
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`cursor-pointer hover:bg-accent/40 transition-colors ${c.id === activeId ? "bg-primary/5 font-semibold" : ""}`}
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-medium">{c.name}</td>
                <td className="px-3 py-2.5">
                  <SourceBadge value={c.source} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge value={c.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                  {formatDate(c.startDate)} – {formatDate(c.endDate)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-numeric">{formatINR(c.budget)}</td>
                <td className="px-3 py-2.5 text-numeric">{c.leads}</td>
                <td className="px-3 py-2.5 text-numeric">{c.applications}</td>
                <td className="px-3 py-2.5 text-numeric font-bold text-emerald-600">{c.admissions}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-numeric text-success font-semibold">
                  {formatINR(c.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={active.name} description="Campaign conversion funnel" className="xl:col-span-2">
          <FunnelChart
            stages={[
              { stage: "Leads", value: active.leads },
              { stage: "Qualified", value: active.qualified },
              { stage: "Counselling", value: Math.round(active.qualified * 0.55) },
              { stage: "Applications", value: active.applications },
              { stage: "Admissions", value: active.admissions },
            ]}
          />
        </Panel>
        <div className="space-y-3">
          <StatTile label="Total Budget" value={formatINR(active.budget)} />
          <StatTile label="Spend to Date" value={formatINR(active.spend)} />
          <StatTile
            label="Cost per Lead (CPL)"
            value={formatINR(Math.round(active.spend / Math.max(active.leads, 1)))}
          />
          <StatTile
            label="Cost per Admission (CAC)"
            value={formatINR(Math.round(active.spend / Math.max(active.admissions, 1)))}
          />
          <StatTile label="Attributed Revenue" value={formatINR(active.revenue)} tone="text-success" />
        </div>
      </div>

      <Panel title={`Leads from ${active.name}`} description="Students acquired through this campaign" bodyClassName="p-0">
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {campaignLeads.slice(0, 15).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
              <Link
                href={`/leads/${l.id}`}
                className="text-sm font-semibold hover:text-primary transition-colors hover:underline"
              >
                {l.name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {l.stage} · {l.city}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{l.id}</span>
              </div>
            </li>
          ))}
          {campaignLeads.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">No leads attributed yet.</li>
          )}
        </ul>
      </Panel>

      {/* Create Campaign Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Marketing Campaign"
        description="Launch and track a new student acquisition campaign."
        footer={
          <>
            <PrimaryButton tone="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </PrimaryButton>
            <PrimaryButton onClick={handleCreateCampaign}>
              Save Campaign
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <Field label="Campaign Name *">
            <input
              type="text"
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Search MBBS Georgia Intake 2026"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Channel Source">
              <select
                className={selectClass}
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Budget Allocated (₹)">
              <input
                type="number"
                required
                className={inputClass}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="100000"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start Date">
              <input
                type="date"
                required
                className={inputClass}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>

            <Field label="End Date">
              <input
                type="date"
                required
                className={inputClass}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
