"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Modal, Field, inputClass, textareaClass, selectClass, PrimaryButton } from "./modal";
import { callOutcomes } from "@/data/mock";
import { logCall, getLeads, getTelecallers } from "@/services/api";
import {
  CallAudioRecorder,
  uploadCallRecording,
  uploadNativeCallRecordingFile,
  fetchCallAiSummary,
} from "@/lib/audio-recorder";
import { Mic, Volume2, Sparkles, Loader2, StopCircle, Upload, FolderOpen } from "lucide-react";

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
  const [duration, setDuration] = useState("5m 20s");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("Share fee structure & shortlist");
  const [scheduleNextFollowUp, setScheduleNextFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);

  // Live recording state
  const recorderRef = useRef<CallAudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recTimer, setRecTimer] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedRecordingUrl, setUploadedRecordingUrl] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFileName, setAttachedFileName] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiProcessing(true);
    setAttachedFileName(file.name);
    const targetId = initialLeadId || leadId;

    try {
      const localUrl = URL.createObjectURL(file);
      setAudioUrl(localUrl);

      const uploadRes = await uploadNativeCallRecordingFile(file, targetId, duration);
      if (uploadRes?.recordingUrl) {
        setUploadedRecordingUrl(uploadRes.recordingUrl);
      }

      const summary = await fetchCallAiSummary({
        leadId: targetId,
        leadName: targetLead?.name || "Student",
        course: targetLead?.course || "MBBS Abroad",
        country: targetLead?.country || "Kazakhstan",
        duration: duration,
        recordingUrl: uploadRes?.recordingUrl,
      });

      if (summary) {
        setAiSummary(summary);
        if (summary.suggestedOutcome) setOutcome(summary.suggestedOutcome);
        if (summary.overview) {
          let nText = summary.overview;
          if (summary.keyPoints && summary.keyPoints.length > 0) {
            nText += "\n\nKey Points:\n" + summary.keyPoints.map((kp: string) => `• ${kp}`).join("\n");
          }
          setNotes(nText);
        }
        if (summary.suggestedFollowUp) setNextAction(summary.suggestedFollowUp);
        if (summary.followUpDate) setFollowUpDate(summary.followUpDate);
      }
      toast.success("Recording attached & summarized by Gemini AI!", { icon: "✨" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to process recording file");
    } finally {
      setIsAiProcessing(false);
      if (e.target) e.target.value = "";
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const targetLead = leads.find((l) => l.id === (initialLeadId || leadId));

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleStartRecording = async () => {
    const recorder = new CallAudioRecorder();
    recorderRef.current = recorder;
    const started = await recorder.start();
    if (started) {
      setIsRecording(true);
      setRecTimer(0);
      setAudioUrl(null);
      setUploadedRecordingUrl(null);
      toast.success("Recording started via microphone", { icon: "🎙️" });
    } else {
      toast.error("Failed to access microphone. Please check browser permissions.");
    }
  };

  const handleStopRecordingAndSummarize = async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);
    setIsAiProcessing(true);

    try {
      const recResult = await recorderRef.current.stop();
      if (recResult?.blob) {
        setAudioUrl(recResult.url);
        const formatted = formatTimer(recTimer);
        setDuration(formatted);

        const targetId = initialLeadId || leadId;
        const uploadUrl = await uploadCallRecording(recResult.blob, targetId, formatted);
        if (uploadUrl) {
          setUploadedRecordingUrl(uploadUrl);
        }

        const summary = await fetchCallAiSummary({
          leadId: targetId,
          leadName: targetLead?.name || "Student",
          course: targetLead?.course || "MBBS Abroad",
          country: targetLead?.country || "Kazakhstan",
          transcript: recResult.transcript,
          duration: formatted,
        });

        if (summary) {
          setAiSummary(summary);
          if (summary.suggestedOutcome) setOutcome(summary.suggestedOutcome);
          if (summary.overview) {
            let nText = summary.overview;
            if (summary.keyPoints && summary.keyPoints.length > 0) {
              nText += "\n\nKey Points:\n" + summary.keyPoints.map((kp: string) => `• ${kp}`).join("\n");
            }
            setNotes(nText);
          }
          if (summary.suggestedFollowUp) setNextAction(summary.suggestedFollowUp);
          if (summary.followUpDate) setFollowUpDate(summary.followUpDate);
        }
        toast.success("Call audio recorded & summarized by AI!", { icon: "✨" });
      }
    } catch (err) {
      console.warn("Recording/AI error:", err);
      toast.error("Failed to complete recording or AI summary");
    } finally {
      setIsAiProcessing(false);
    }
  };

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
        recordingUrl: uploadedRecordingUrl || audioUrl || undefined,
        aiSummary: aiSummary || undefined,
      });

      toast.success("Call logged successfully", {
        description: `${outcome} call recorded for ${targetLead?.name || "Student"} and added to timeline.`,
      });

      setNotes("");
      setAudioUrl(null);
      setUploadedRecordingUrl(null);
      setAiSummary(null);

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
      title="Log Call & Audio Recording"
      description={
        targetLead
          ? `Record phone discussion with ${targetLead.name} (${targetLead.phone})`
          : "Record telephone conversation with audio capture and AI summary"
      }
      footer={
        <>
          <PrimaryButton tone="ghost" onClick={onClose} disabled={loading || isRecording}>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={handleSave} disabled={loading || isRecording || isAiProcessing}>
            {loading ? "Saving…" : "Save Call Log"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* ── LIVE AUDIO RECORDING BAR ── */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5 text-slate-800">
              <Mic className="size-4 text-indigo-600" />
              <span>Voice Call Recorder</span>
            </span>
            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <span className="size-2 rounded-full bg-rose-600 animate-ping" />
                REC {formatTimer(recTimer)}
              </span>
            )}
          </div>

          {!isRecording && !audioUrl && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <Mic className="size-3.5 text-rose-600" />
                <span>Record via Mic</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs border border-indigo-200 shadow-2xs transition-all cursor-pointer"
              >
                <FolderOpen className="size-3.5 text-indigo-600" />
                <span>Attach Phone File (.m4a)</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.aac,.amr,.ogg"
            onChange={handleFileUpload}
            className="hidden"
          />

          {isRecording && (
            <button
              type="button"
              onClick={handleStopRecordingAndSummarize}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <StopCircle className="size-4" />
              <span>End Recording &amp; Summarize with AI ✨</span>
            </button>
          )}

          {isAiProcessing && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-indigo-600">
              <Loader2 className="size-4 animate-spin" />
              <span>AI Analyzing Audio Recording…</span>
            </div>
          )}

          {audioUrl && !isRecording && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Volume2 className="size-3.5" /> Recording Saved
                </span>
                <span>{duration}</span>
              </div>
              <audio controls className="w-full h-8 rounded-lg" src={audioUrl} />
            </div>
          )}

          {aiSummary && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2.5 text-xs text-indigo-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1 text-indigo-900">
                  <Sparkles className="size-3 text-indigo-600" /> AI Summary
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white rounded border border-indigo-200 text-indigo-700">
                  {aiSummary.sentiment || "High Intent"}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">{aiSummary.overview}</p>
            </div>
          )}
        </div>

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
              placeholder="e.g. 5m 20s"
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

        <Field label="Discussion Notes & AI Summary">
          <textarea
            rows={3}
            className={textareaClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record discussion notes, student preferences, or review AI summary…"
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
              <span>Schedule Next Callback Reminder</span>
            </label>
          </div>

          {scheduleNextFollowUp && (
            <Field label="Callback Date">
              <input
                type="date"
                className={inputClass}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}
