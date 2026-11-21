"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal, Field, inputClass, textareaClass, selectClass, PrimaryButton } from "./modal";
import { callOutcomes } from "@/data/mock";
import { logCall, getLeads, getTelecallers } from "@/services/api";

export function LogCallModal({
  open,
  onClose,
  leadId: initialLeadId,
  leadName,
  onCallLogged,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  leadName?: string;
  onCallLogged?: () => void;
}) {
  const leads = getLeads();
  const telecallers = getTelecallers();

  const [leadId, setLeadId] = useState(initialLeadId || leads[0]?.id || "");
  const [telecallerId, setTelecallerId] = useState(telecallers[0]?.id || "");
  const [outcome, setOutcome] = useState(callOutcomes[0]!);
  const [duration, setDuration] = useState("6m 45s");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("Share fee structure & hostel photos");
  const [scheduleNextFollowUp, setScheduleNextFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState("2026-10-22");
  const [loading, setLoading] = useState(false);

  useState(() => {
    // static initial
  });

  const targetLead = leads.find((l) => l.id === (initialLeadId || leadId));

  const handleSave = () => {
    const effectiveLeadId = initialLeadId || leadId;
    if (!effectiveLeadId) {
      toast.error("Please select a student lead");
      return;
    }

    setLoading(true);
    try {
      logCall({
        leadId: effectiveLeadId,
        telecallerId,
        outcome,
        duration,
        notes: notes.trim() || `Discussed university admission preferences. Outcome: ${outcome}`,
        nextAction: nextAction.trim(),
        followUpDate: scheduleNextFollowUp && followUpDate ? new Date(`${followUpDate}T11:00:00`).toISOString() : undefined,
      });

      toast.success("Call logged successfully", {
        description: `${outcome} call recorded for ${targetLead?.name || "Student"} and added to timeline.`,
      });

      setNotes("");
      if (onCallLogged) {
        onCallLogged();
      }
      onClose();
    } catch {
      toast.error("Failed to log call");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Call"
      description={
        targetLead
          ? `Record phone conversation with ${targetLead.name} (${targetLead.phone})`
          : "Record a telephone discussion against a student lead"
      }
      footer={
        <>
          <PrimaryButton tone="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save Call Log"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {!initialLeadId && (
          <Field label="Student Lead">
            <select
              className={selectClass}
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.id} ({l.phone})
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Call Outcome">
            <select
              className={selectClass}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              {callOutcomes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Call Duration">
            <input
              className={inputClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 8m 12s"
            />
          </Field>
        </div>

        <Field label="Telecaller / Counsellor">
          <select
            className={selectClass}
            value={telecallerId}
            onChange={(e) => setTelecallerId(e.target.value)}
          >
            {telecallers.length === 0 && <option value="">Admin / Counsellor</option>}
            {telecallers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.team})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Discussion Notes & Student Feedback">
          <textarea
            rows={3}
            className={textareaClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Student is interested in MBBS Kazakhstan. Parent requested complete fee structure and hostel details."
          />
        </Field>

        <div className="pt-2 border-t border-border space-y-3">
          <Field label="Agreed Next Action">
            <input
              className={inputClass}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Send fee comparison on WhatsApp"
            />
          </Field>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={scheduleNextFollowUp}
                onChange={(e) => setScheduleNextFollowUp(e.target.checked)}
                className="rounded border-border"
              />
              Schedule follow-up reminder
            </label>

            {scheduleNextFollowUp && (
              <input
                type="date"
                className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs outline-none focus:border-primary"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
