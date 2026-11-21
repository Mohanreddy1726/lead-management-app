"use client";

import React, { useState } from "react";
import { Modal, Field, inputClass, selectClass, PrimaryButton } from "./modal";
import { scheduleFollowUp, getLeads, getTelecallers } from "@/services/api";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

interface ScheduleFollowUpModalProps {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  leadName?: string;
  onScheduled?: () => void;
}

export function ScheduleFollowUpModal({
  open,
  onClose,
  leadId: initialLeadId,
  leadName: initialLeadName,
  onScheduled,
}: ScheduleFollowUpModalProps) {
  const leads = getLeads();
  const telecallers = getTelecallers();

  const [leadId, setLeadId] = useState(initialLeadId || leads[0]?.id || "");
  const [telecallerId, setTelecallerId] = useState(telecallers[0]?.id || "");
  const [date, setDate] = useState("2026-10-22");
  const [time, setTime] = useState("11:30");
  const [reason, setReason] = useState("Fee discussion and university shortlist");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("High");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    try {
      const d = new Date(Date.now() + 86400000);
      setDate(d.toISOString().slice(0, 10));
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      toast.error("Please select a student lead");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a follow-up agenda/reason");
      return;
    }

    setLoading(true);
    try {
      const fullIsoDate = new Date(`${date}T${time}:00`).toISOString();
      scheduleFollowUp({
        leadId,
        telecallerId,
        date: fullIsoDate,
        reason: reason.trim(),
        priority,
      });

      const selectedLead = leads.find((l) => l.id === leadId);
      toast.success("Follow-up scheduled", {
        description: `Scheduled for ${selectedLead?.name || "Student"} on ${date} at ${time}.`,
      });

      if (onScheduled) {
        onScheduled();
      }
      onClose();
    } catch {
      toast.error("Failed to schedule follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule Follow-up"
      description={
        initialLeadName
          ? `Schedule next callback or counseling check-in for ${initialLeadName}`
          : "Add an urgent reminder or call check-in for a prospective student"
      }
      footer={
        <>
          <PrimaryButton tone="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            {loading ? "Scheduling…" : "Schedule Reminder"}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialLeadId && (
          <Field label="Select Student Lead *">
            <select
              className={selectClass}
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.id} ({l.course})
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Follow-up Date *">
            <input
              type="date"
              required
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field label="Time *">
            <input
              type="time"
              required
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Priority Level">
            <select
              className={selectClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Low")}
            >
              <option value="High">High (Critical conversion)</option>
              <option value="Medium">Medium (Standard callback)</option>
              <option value="Low">Low (Nudge / check-in)</option>
            </select>
          </Field>

          <Field label="Assigned Telecaller">
            <select
              className={selectClass}
              value={telecallerId}
              onChange={(e) => setTelecallerId(e.target.value)}
            >
              {telecallers.length === 0 && <option value="">Admin / Counsellor</option>}
              {telecallers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Reason & Agenda *">
          <textarea
            rows={3}
            required
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Call parent regarding MBBS Semey fee split and hostel accommodation"
          />
        </Field>
      </form>
    </Modal>
  );
}
