"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Clock, CalendarClock, Plus } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/shared/page";
import { PrimaryButton } from "@/components/modals/modal";
import { StatusBadge } from "@/components/shared/badges";
import {
  formatDateTime,
  getFollowUps,
  getLeadById,
  getTelecallerById,
  completeFollowUp,
  rescheduleFollowUp,
  store,
} from "@/services/api";
import { ScheduleFollowUpModal } from "@/components/modals/schedule-follow-up-modal";
import { TODAY } from "@/data/mock";
import { useBranch } from "@/context/BranchContext";
import { cn } from "@/lib/utils";

const TABS = ["Today", "Upcoming", "Overdue", "Completed"] as const;

export default function FollowUpsPage() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { branch } = useBranch();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const followUpsList = getFollowUps(branch);

  const isToday = (iso: string) => {
    try {
      return new Date(iso).toDateString() === TODAY.toDateString();
    } catch {
      return false;
    }
  };

  const items = followUpsList.filter((f) => {
    if (tab === "Completed") return f.status === "Completed";
    if (tab === "Overdue") return f.status === "Overdue";
    if (tab === "Today") return f.status !== "Completed" && isToday(f.date);
    return f.status === "Pending" && new Date(f.date) > TODAY && !isToday(f.date);
  });

  const reminders = followUpsList.filter((f) => f.status === "Overdue").slice(0, 2);

  const handleComplete = (id: string, studentName?: string) => {
    completeFollowUp(id);
    toast.success(`Follow-up completed${studentName ? ` for ${studentName}` : ""}`);
  };

  const handleReschedule = (id: string, studentName?: string) => {
    const nextDate = new Date(TODAY.getTime() + 86400000).toISOString();
    rescheduleFollowUp(id, nextDate);
    toast.success(`Follow-up rescheduled (+1 day)${studentName ? ` for ${studentName}` : ""}`);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Follow-ups`}
        subtitle={`Every scheduled ${branch === "masters" ? "Masters" : "MBBS"} student conversation, sorted by urgency.`}
        actions={
          <PrimaryButton tone="brand" onClick={() => setScheduleModalOpen(true)}>
            <Plus className="size-4" /> Schedule Follow-up
          </PrimaryButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="panel flex items-start gap-3 border-warning/40 p-4">
          <Clock className="mt-0.5 size-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-semibold">Follow-up due in 15 minutes</p>
            <p className="text-sm text-muted-foreground">Rahul Sharma · Fee discussion · 11:00 AM</p>
          </div>
        </div>
        <div className="panel flex items-start gap-3 border-destructive/40 p-4">
          <AlertTriangle className="mt-0.5 size-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Overdue</p>
            <p className="text-sm text-muted-foreground">
              {reminders[0]
                ? `${getLeadById(reminders[0].leadId)?.name || "Student"} · ${reminders[0].reason}`
                : "Ananya Reddy · Parent discussion"}{" "}
              · 09:00 AM
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => {
          const count = followUpsList.filter((f) =>
            t === "Completed"
              ? f.status === "Completed"
              : t === "Overdue"
                ? f.status === "Overdue"
                : t === "Today"
                  ? f.status !== "Completed" && isToday(f.date)
                  : f.status === "Pending" && new Date(f.date) > TODAY && !isToday(f.date),
          ).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm cursor-pointer whitespace-nowrap transition-colors",
                tab === t
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t} <span className="text-numeric text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Panel>
          <EmptyState
            title={`No ${tab.toLowerCase()} follow-ups`}
            description="When follow-ups are scheduled they appear here with the student, reason and priority."
            action={
              <PrimaryButton tone="brand" onClick={() => setScheduleModalOpen(true)}>
                Schedule Follow-up
              </PrimaryButton>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((f) => {
            const lead = getLeadById(f.leadId);
            const owner = getTelecallerById(f.telecallerId);
            return (
              <article key={f.id} className="panel space-y-3 p-4 hover:shadow-xs transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/leads/${f.leadId}`}
                      className="font-medium hover:text-primary transition-colors hover:underline"
                    >
                      {lead?.name || "Student Lead"}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">{f.leadId}</p>
                  </div>
                  <StatusBadge value={f.priority} />
                </div>
                <p className="text-sm text-foreground/90">{f.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(f.date)} · {owner?.name || "Unassigned"}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                  <StatusBadge value={f.status} />
                  <div className="flex gap-2">
                    {f.status !== "Completed" && (
                      <PrimaryButton
                        tone="ghost"
                        onClick={() => handleComplete(f.id, lead?.name)}
                      >
                        Complete
                      </PrimaryButton>
                    )}
                    <PrimaryButton
                      tone="ghost"
                      onClick={() => handleReschedule(f.id, lead?.name)}
                    >
                      Reschedule
                    </PrimaryButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      <ScheduleFollowUpModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />
    </div>
  );
}
