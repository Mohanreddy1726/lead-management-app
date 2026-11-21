import {
  admissions as initialAdmissions,
  applications as initialApplications,
  assignmentRules as initialAssignmentRules,
  auditLog as initialAuditLog,
  automationRules as initialAutomationRules,
  callScripts,
  calls as initialCalls,
  campaigns as initialCampaigns,
  counsellingRecords as initialCounselling,
  documentsFor,
  duplicateGroups as initialDuplicates,
  followUps as initialFollowUps,
  leadSources as initialLeadSources,
  leads as initialLeads,
  managers as initialManagers,
  notifications as initialNotifications,
  paymentsFor,
  savedViews,
  scheduleEvents,
  teamMembers as initialTeamMembers,
  telecallers as initialTelecallers,
  timelineFor,
} from "@/data/mock";
import type {
  Lead,
  LeadSource,
  TeamMember,
  CallLog,
  FollowUp,
  TimelineEvent,
  DocumentItem,
  Payment,
  Application,
  Admission,
  CounsellingRecord,
  AssignmentRule,
  Campaign,
  LeadSourceItem,
  DuplicateGroup,
  Branch,
} from "@/data/types";

// In-memory mutable states
const leads: Lead[] = [...initialLeads];
const calls: CallLog[] = [...initialCalls];
const followUps: FollowUp[] = [...initialFollowUps];
const applications: Application[] = [...initialApplications];
const admissions: Admission[] = [...initialAdmissions];
const counsellingRecords: CounsellingRecord[] = [...initialCounselling];
const teamMembers: TeamMember[] = [...initialTeamMembers];
const telecallers: TeamMember[] = [...initialTelecallers];
const managers: TeamMember[] = [...initialManagers];
const campaigns: Campaign[] = [...initialCampaigns];
const leadSources = [...initialLeadSources];
const assignmentRules = [...initialAssignmentRules];
const duplicateGroups: DuplicateGroup[] = [...initialDuplicates];
const notifications = [...initialNotifications];
const auditLog = [...initialAuditLog];

// Custom overrides cache for per-lead sub-entities
const timelineCache = new Map<string, TimelineEvent[]>();
const documentsCache = new Map<string, DocumentItem[]>();
const paymentsCache = new Map<string, Payment[]>();

const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version += 1;
  listeners.forEach((l) => l());
};

export const store = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => version,
};

// ── SYNC FROM MONGODB / REALTIME INGESTION ─────────────────────────
let lastLeadsFingerprint = "";

const normalizePhone = (raw: string): string => {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export const syncLeadsFromDb = async (forceEmit = false) => {
  if (typeof window === "undefined") return;
  try {
    const url = forceEmit ? "/api/leads?sync=true" : "/api/leads";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (data.leads && Array.isArray(data.leads)) {
      const seen = new Set<string>();
      const uniqueLeads: Lead[] = [];
      for (const item of data.leads) {
        const norm = normalizePhone(item.phone);
        const key = `${norm}_${item.branch || "mbbs"}`;
        if (!norm || !seen.has(key)) {
          if (norm) seen.add(key);
          uniqueLeads.push(item);
        }
      }
      const fingerprint = `${uniqueLeads.length}-${uniqueLeads[0]?.id || ""}-${uniqueLeads[uniqueLeads.length - 1]?.id || ""}`;
      if (forceEmit || fingerprint !== lastLeadsFingerprint) {
        lastLeadsFingerprint = fingerprint;
        leads.length = 0;
        leads.push(...uniqueLeads);
        emit();
      }
    }
  } catch (err) {
    console.warn("[Store] Sync error:", err);
  }
};

export const syncTeamFromDb = async () => {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/team");
    if (!res.ok) return;
    const data = await res.json();
    if (data.teamMembers && Array.isArray(data.teamMembers)) {
      teamMembers.length = 0;
      telecallers.length = 0;
      managers.length = 0;

      for (const m of data.teamMembers) {
        teamMembers.push(m);
        if (m.role === "Manager") {
          managers.push(m);
        } else {
          telecallers.push(m);
        }
      }
      emit();
    }
  } catch (err) {
    console.warn("[Store] Sync team error:", err);
  }
};



// ── GETTERS ──────────────────────────────────────────────────────────
export const getLeads = (branch?: Branch) => {
  const list = branch ? leads.filter((l) => l.branch === branch) : leads;
  const seen = new Set<string>();
  return list.filter((l) => {
    const norm = normalizePhone(l.phone);
    if (!norm) return true;
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
};

export const getLeadById = (id: string) => leads.find((l) => l.id === id) ?? null;

export const getTelecallers = (branch?: Branch) =>
  branch ? telecallers.filter((t) => t.branch === branch) : telecallers;

export const getTelecallerById = (id: string | null) =>
  id ? (telecallers.find((t) => t.id === id) ?? null) : null;

export const getTeamMembers = (branch?: Branch) =>
  branch ? teamMembers.filter((m) => m.branch === branch) : teamMembers;

export const getTeamMemberById = (id: string | null) =>
  id ? (teamMembers.find((m) => m.id === id) ?? null) : null;

export const getManagers = (branch?: Branch) =>
  teamMembers.filter((m) => m.role === "Manager" && (!branch || m.branch === branch));

export const getCampaigns = (branch?: Branch) =>
  branch ? campaigns.filter((c) => c.branch === branch) : campaigns;

export const getCampaignById = (id: string | null) =>
  id ? (campaigns.find((c) => c.id === id) ?? null) : null;

export const getSources = (branch?: Branch): LeadSourceItem[] => {
  const filteredLeads = branch ? leads.filter((l) => l.branch === branch) : leads;
  const stageList = ["New","Assigned","Contacted","Interested","Counselling","Application","Documentation","Admission","Converted"];
  return [
    "Meta Ads",
    "Google Ads",
    "Website",
    "WhatsApp",
    "Manual",
    "CSV Import",
  ].map((source) => {
    const list = filteredLeads.filter((l) => l.source === source);
    const stageAtLeast = (n: number) =>
      list.filter((l) => stageList.indexOf(l.stage) >= n).length;
    return {
      name: source as LeadSource,
      enabled: true,
      leads: list.length,
      contacted: stageAtLeast(2),
      interested: stageAtLeast(3),
      applications: stageAtLeast(5),
      admissions: stageAtLeast(7),
    };
  });
};

export const getCalls = (branch?: Branch) => {
  if (!branch) return calls;
  return calls.filter((c) => {
    const lead = leads.find((l) => l.id === c.leadId);
    return lead ? lead.branch === branch : true;
  });
};

export const getCallsForLead = (leadId: string) => calls.filter((c) => c.leadId === leadId);

export const getCallScripts = (branch?: Branch) => {
  if (!branch) return callScripts;
  if (branch === "masters") {
    return callScripts.filter((cs) => cs.title.toLowerCase().includes("masters"));
  }
  return callScripts.filter((cs) => cs.title.toLowerCase().includes("mbbs"));
};

export const getFollowUps = (branch?: Branch) => {
  if (!branch) return followUps;
  return followUps.filter((f) => {
    const lead = leads.find((l) => l.id === f.leadId);
    return lead ? lead.branch === branch : true;
  });
};

export const getFollowUpsForLead = (leadId: string) => followUps.filter((f) => f.leadId === leadId);

export const getApplications = (branch?: Branch) => {
  if (!branch) return applications;
  return applications.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead ? lead.branch === branch : true;
  });
};

export const getApplicationsForLead = (leadId: string) =>
  applications.filter((a) => a.leadId === leadId);

export const getAdmissions = (branch?: Branch) => {
  if (!branch) return admissions;
  return admissions.filter((a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return lead ? lead.branch === branch : true;
  });
};

export const getAdmissionsForLead = (leadId: string) =>
  admissions.filter((a) => a.leadId === leadId);

export const getCounselling = (branch?: Branch) => {
  if (!branch) return counsellingRecords;
  return counsellingRecords.filter((c) => {
    const lead = leads.find((l) => l.id === c.leadId);
    return lead ? lead.branch === branch : true;
  });
};

export const getCounsellingForLead = (leadId: string) =>
  counsellingRecords.filter((c) => c.leadId === leadId);
export const getSchedule = () => scheduleEvents;
export const getNotifications = () => notifications;
export const getAuditLog = () => auditLog;
export const getAutomationRules = () => initialAutomationRules;
export const getAssignmentRules = () => assignmentRules;
export const getDuplicates = () => duplicateGroups;
export const getSavedViews = () => savedViews;

export function getTimeline(leadId: string): TimelineEvent[] {
  if (!timelineCache.has(leadId)) {
    timelineCache.set(leadId, timelineFor(leadId));
  }
  return timelineCache.get(leadId)!;
}

export function getDocuments(leadId: string): DocumentItem[] {
  if (!documentsCache.has(leadId)) {
    documentsCache.set(leadId, documentsFor(leadId));
  }
  return documentsCache.get(leadId)!;
}

export function getPayments(leadId: string): Payment[] {
  if (!paymentsCache.has(leadId)) {
    paymentsCache.set(leadId, paymentsFor(leadId));
  }
  return paymentsCache.get(leadId)!;
}

// ── MUTATIONS ────────────────────────────────────────────────────────
export function createLead(input: Partial<Lead>): Lead {
  const uniqueIdNum = Math.floor(100000 + Math.random() * 900000);
  const leadId = input.id || `GVK-2026-${uniqueIdNum}`;
  const branch: Branch =
    input.branch ||
    (input.course?.toLowerCase().includes("masters") ? "masters" : "mbbs");


  const lead: Lead = {
    id: leadId,
    name: input.name ?? "New Student",
    phone: input.phone ?? "",
    email: input.email ?? "",
    city: input.city ?? "Hyderabad",
    state: input.state ?? "Telangana",
    source: input.source ?? "Manual",
    campaignId: input.campaignId ?? null,
    course: input.course ?? (branch === "masters" ? "Masters Abroad" : "MBBS Abroad"),
    country: input.country ?? (branch === "masters" ? "Germany" : "Kazakhstan"),
    university: input.university,
    score: input.score ?? 50,
    scoreBreakdown: input.scoreBreakdown ?? [
      { label: "Valid Phone & Email Verified", points: 20, earned: true },
      { label: "Course Selected", points: 15, earned: true },
      { label: "Destination Country Chosen", points: 15, earned: true },
    ],
    assignedTo: input.assignedTo ?? null,
    stage: input.stage ?? (input.assignedTo ? "Assigned" : "New"),
    status: input.status ?? "New",
    tags: input.tags ?? ["Direct Enquiry"],
    nextFollowUp: input.nextFollowUp ?? null,
    createdAt: new Date().toISOString(),
    attribution: input.attribution ?? { utmSource: input.source?.toLowerCase() || "manual" },
    neetScore: input.neetScore,
    budget: input.budget,
    parentName: input.parentName,
    branch,
  };

  leads.unshift(lead);

  // Initialize timeline with created event
  const events: TimelineEvent[] = [
    {
      id: `${leadId}-evt-1`,
      leadId,
      at: new Date().toISOString(),
      type: "lead",
      title: "Lead Created",
      detail: `Captured via ${lead.source}${lead.assignedTo ? ` and assigned to ${getTelecallerById(lead.assignedTo)?.name || lead.assignedTo}` : ""}`,
      actor: "System",
    },
  ];
  timelineCache.set(leadId, events);

  // Audit entry
  auditLog.unshift({
    id: `aud-${Date.now().toString().slice(-6)}`,
    user: "System",
    action: "Created Lead",
    leadId,
    module: "Leads",
    at: new Date().toISOString(),
    from: "None",
    to: lead.name,
  });

  emit();
  return lead;
}

export function updateLead(id: string, patch: Partial<Lead>) {
  const lead = leads.find((l) => l.id === id);
  if (!lead) return null;

  const prevStage = lead.stage;
  const prevStatus = lead.status;
  const prevAssigned = lead.assignedTo;

  Object.assign(lead, patch);

  // If stage changed, append to timeline
  if (patch.stage && patch.stage !== prevStage) {
    addTimelineEvent(id, {
      type: "stage",
      title: `Stage Changed to ${patch.stage}`,
      detail: `Progressed from ${prevStage} to ${patch.stage}`,
      actor: "Counsellor",
    });
  }

  // If assignedTo changed, append to timeline
  if (patch.assignedTo && patch.assignedTo !== prevAssigned) {
    const caller = getTelecallerById(patch.assignedTo);
    addTimelineEvent(id, {
      type: "assignment",
      title: `Assigned to ${caller?.name || patch.assignedTo}`,
      detail: `Lead ownership transferred`,
      actor: "Manager",
    });
  }

  emit();
  return lead;
}

export function deleteLead(id: string): boolean {
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  leads.splice(idx, 1);
  emit();

  if (typeof window !== "undefined") {
    fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch((err) => console.warn("[API] Delete lead error:", err));
  }
  return true;
}

export function assignLead(id: string, telecallerId: string) {
  const result = updateLead(id, { assignedTo: telecallerId, stage: "Assigned" });
  if (typeof window !== "undefined") {
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: [id], assignedTo: telecallerId, stage: "Assigned" }),
    }).catch((err) => console.warn("[API] Assign lead error:", err));
  }
  return result;
}

export function bulkAssignLeads(ids: string[], telecallerId: string) {
  ids.forEach((id) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      lead.assignedTo = telecallerId;
      lead.stage = "Assigned";
      addTimelineEvent(id, {
        type: "assignment",
        title: `Assigned to ${getTelecallerById(telecallerId)?.name || telecallerId}`,
        detail: `Lead manually assigned by Admin/Manager`,
        actor: "Lead Assignment",
      });
    }
  });
  emit();

  if (typeof window !== "undefined") {
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: ids, assignedTo: telecallerId, stage: "Assigned" }),
    }).catch((err) => console.warn("[API] Bulk assign error:", err));
  }
  return ids.length;
}

export async function distributeLeadsToCallers(
  assignments: { leadId: string; assignedTo: string }[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    for (const item of assignments) {
      const lead = leads.find((l) => l.id === item.leadId);
      if (lead) {
        lead.assignedTo = item.assignedTo;
        lead.stage = "Assigned";
        addTimelineEvent(item.leadId, {
          type: "assignment",
          title: `Assigned to ${item.assignedTo}`,
          detail: `Lead manually assigned by Admin/Manager`,
          actor: "Lead Assignment",
        });
      }
    }
    emit();

    if (typeof window !== "undefined") {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      return { success: true, count: data.count || assignments.length };
    }
    return { success: true, count: assignments.length };
  } catch (err: any) {
    console.error("[distributeLeadsToCallers error]:", err);
    return { success: false, error: err.message || "Failed to distribute leads" };
  }
}

export function bulkUpdateLeads(ids: string[], patch: Partial<Lead>) {
  ids.forEach((id) => updateLead(id, patch));
  return ids.length;
}

export function bulkDeleteLeads(ids: string[]): number {
  let count = 0;
  ids.forEach((id) => {
    const idx = leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      leads.splice(idx, 1);
      count++;
    }
  });
  emit();

  if (typeof window !== "undefined" && ids.length > 0) {
    fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch((err) => console.warn("[API] Bulk delete leads error:", err));
  }
  return count;
}

// ── CALLS & LOGS ──────────────────────────────────────────────────────
export function logCall(input: {
  leadId: string;
  telecallerId?: string;
  outcome: string;
  notes: string;
  duration?: string;
  nextAction?: string;
  followUpDate?: string;
}): CallLog {
  const lead = getLeadById(input.leadId);
  const telecallerId = input.telecallerId || lead?.assignedTo || telecallers[0]?.id || "tc-1";
  const duration = input.duration || "5m 20s";

  const newCall: CallLog = {
    id: `call-${Date.now().toString().slice(-6)}`,
    leadId: input.leadId,
    telecallerId,
    date: new Date().toISOString(),
    duration,
    outcome: input.outcome,
    notes: input.notes,
    nextAction: input.nextAction,
  };

  calls.unshift(newCall);

  // Increment telecaller call stats
  const caller = getTeamMemberById(telecallerId);
  if (caller) {
    caller.callsToday = (caller.callsToday || 0) + 1;
    if (input.outcome === "Interested") {
      caller.interested = (caller.interested || 0) + 1;
    }
  }

  // Update lead stage / status
  if (lead) {
    if (lead.stage === "New" || lead.stage === "Assigned") {
      lead.stage = "Contacted";
    }
    if (input.outcome === "Interested") {
      lead.stage = "Interested";
      lead.status = "Interested";
    } else if (input.outcome === "Not Interested") {
      lead.status = "Not Interested";
    } else if (input.outcome === "Connected") {
      lead.status = "Contacted";
    }
  }

  // Add timeline entry
  addTimelineEvent(input.leadId, {
    type: "call",
    title: `Call Logged · ${input.outcome}`,
    detail: `${input.notes || "Call completed"} (Duration: ${duration})`,
    actor: caller?.name || "Telecaller",
  });

  // Schedule follow-up if requested
  if (input.followUpDate) {
    scheduleFollowUp({
      leadId: input.leadId,
      telecallerId,
      date: input.followUpDate,
      reason: input.nextAction || `Follow-up after ${input.outcome} call`,
      priority: input.outcome === "Interested" ? "High" : "Medium",
    });
  }

  emit();
  return newCall;
}

// ── FOLLOW-UPS ───────────────────────────────────────────────────────
export function scheduleFollowUp(input: {
  leadId: string;
  telecallerId?: string;
  date: string;
  reason: string;
  priority?: "High" | "Medium" | "Low";
}): FollowUp {
  const lead = getLeadById(input.leadId);
  const telecallerId = input.telecallerId || lead?.assignedTo || telecallers[0]?.id || "tc-1";

  const newFollowUp: FollowUp = {
    id: `fu-${Date.now().toString().slice(-6)}`,
    leadId: input.leadId,
    telecallerId,
    date: input.date,
    reason: input.reason,
    priority: input.priority || "Medium",
    status: "Pending",
  };

  followUps.unshift(newFollowUp);

  if (lead) {
    lead.nextFollowUp = input.date;
  }

  addTimelineEvent(input.leadId, {
    type: "followup",
    title: `Follow-up Scheduled`,
    detail: `${input.reason} on ${formatDate(input.date)}`,
    actor: getTelecallerById(telecallerId)?.name || "Telecaller",
  });

  emit();
  return newFollowUp;
}

export function completeFollowUp(id: string): boolean {
  const f = followUps.find((item) => item.id === id);
  if (!f) return false;
  f.status = "Completed";

  addTimelineEvent(f.leadId, {
    type: "followup",
    title: `Follow-up Completed`,
    detail: f.reason,
    actor: getTelecallerById(f.telecallerId)?.name || "Telecaller",
  });

  emit();
  return true;
}

export function rescheduleFollowUp(id: string, newDateIso: string): boolean {
  const f = followUps.find((item) => item.id === id);
  if (!f) return false;
  f.date = newDateIso;
  f.status = "Pending";

  const lead = getLeadById(f.leadId);
  if (lead) {
    lead.nextFollowUp = newDateIso;
  }

  addTimelineEvent(f.leadId, {
    type: "followup",
    title: `Follow-up Rescheduled`,
    detail: `Rescheduled to ${formatDate(newDateIso)} (${f.reason})`,
    actor: getTelecallerById(f.telecallerId)?.name || "Telecaller",
  });

  emit();
  return true;
}

// ── TIMELINE ─────────────────────────────────────────────────────────
export function addTimelineEvent(
  leadId: string,
  event: { type: string; title: string; detail?: string; actor?: string },
) {
  const list = getTimeline(leadId);
  const newEvt: TimelineEvent = {
    id: `${leadId}-evt-${Date.now()}`,
    leadId,
    at: new Date().toISOString(),
    type: event.type,
    title: event.title,
    detail: event.detail,
    actor: event.actor || "User",
  };
  list.unshift(newEvt);
  emit();
  return newEvt;
}

// ── DOCUMENTS ────────────────────────────────────────────────────────
export function updateDocumentStatus(
  leadId: string,
  documentName: string,
  status: DocumentItem["status"],
): boolean {
  const list = getDocuments(leadId);
  const doc = list.find((d) => d.name === documentName);
  if (!doc) return false;
  doc.status = status;
  doc.updatedAt = new Date().toISOString();

  addTimelineEvent(leadId, {
    type: "document",
    title: `Document ${documentName}: ${status}`,
    detail: `Status changed to ${status}`,
    actor: "Admissions Officer",
  });

  emit();
  return true;
}

// ── PAYMENTS ─────────────────────────────────────────────────────────
export function recordPayment(
  leadId: string,
  paymentId: string,
  amount: number,
): Payment | null {
  const list = getPayments(leadId);
  const p = list.find((item) => item.id === paymentId);
  if (!p) return null;

  p.paid = Math.min(p.total, p.paid + amount);
  p.status = p.paid >= p.total ? "Paid" : "Partial";

  addTimelineEvent(leadId, {
    type: "payment",
    title: `Fee Payment Received · ${formatINR(amount)}`,
    detail: `Recorded towards ${p.head}. Total paid: ${formatINR(p.paid)} / ${formatINR(p.total)}`,
    actor: "Accounts Desk",
  });

  emit();
  return p;
}

// ── APPLICATIONS & ADMISSIONS ────────────────────────────────────────
export function updateApplicationStage(id: string, stage: Application["stage"]) {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.stage = stage;
  app.updatedAt = new Date().toISOString();

  addTimelineEvent(app.leadId, {
    type: "application",
    title: `Application ${stage}`,
    detail: `${app.university} · ${app.course}`,
    actor: "Counsellor",
  });

  emit();
  return app;
}

export function updateAdmissionStage(id: string, stage: Admission["stage"]) {
  const adm = admissions.find((a) => a.id === id);
  if (!adm) return null;
  adm.stage = stage;

  addTimelineEvent(adm.leadId, {
    type: "admission",
    title: `Admission Status: ${stage}`,
    detail: `${adm.university} (${adm.country})`,
    actor: adm.counsellor,
  });

  emit();
  return adm;
}

export function updateCounsellingStatus(id: string, status: CounsellingRecord["status"]) {
  const rec = counsellingRecords.find((c) => c.id === id);
  if (!rec) return null;
  rec.status = status;

  addTimelineEvent(rec.leadId, {
    type: "counselling",
    title: `Counselling Status: ${status}`,
    detail: `University discussion for ${rec.university}`,
    actor: rec.counsellor,
  });

  emit();
  return rec;
}

// ── DUPLICATES RESOLUTION ─────────────────────────────────────────────
export function resolveDuplicate(id: string, action: "merge" | "keep" | "ignore") {
  const idx = duplicateGroups.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  const removed = duplicateGroups.splice(idx, 1)[0];

  if (action === "merge" && removed) {
    addTimelineEvent(removed.existing.id, {
      type: "merge",
      title: "Duplicate Lead Merged",
      detail: `Merged incoming enquiry from ${removed.incoming.name} (${removed.incoming.phone})`,
      actor: "System",
    });
  }

  emit();
  return true;
}

// ── TEAM MEMBERS ─────────────────────────────────────────────────────
export function addTeamMember(input: Partial<TeamMember>): TeamMember {
  const role = input.role ?? "Telecaller";
  const branch: Branch = input.branch || "mbbs";
  const isManager = role === "Manager";
  const prefix = isManager ? "mgr" : "tc";
  const existingCount = teamMembers.filter((m) => m.role === role).length + 1;
  const id = `${prefix}-${existingCount}-${Date.now().toString().slice(-4)}`;
  const initials = (input.name || "Member")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const newMember: TeamMember = {
    id,
    name: input.name ?? "New Team Member",
    email: input.email ?? `member${existingCount}@leados.com`,
    phone: input.phone ?? "+91 98480 00000",
    role,
    branch,
    team: input.team ?? (branch === "masters" ? "Masters Global Team" : "Hyderabad Team"),
    avatarInitials: initials || "TM",
    presence: input.presence ?? "Active",
    currentActivity: input.currentActivity ?? (isManager ? "Supervising team operations" : "Ready for calls"),
    assigned: input.assigned ?? 0,
    callsToday: input.callsToday ?? 0,
    followUps: input.followUps ?? 0,
    interested: input.interested ?? 0,
    applications: input.applications ?? 0,
    admissions: input.admissions ?? 0,
    revenue: input.revenue ?? 0,
    joinDate: new Date().toISOString().slice(0, 10),
    targets:
      input.targets ??
      (isManager
        ? [
            { label: "Team Calls", done: 0, target: 500 },
            { label: "Qualified Leads", done: 0, target: 150 },
            { label: "Applications", done: 0, target: 40 },
            { label: "Admissions", done: 0, target: 15 },
          ]
        : [
            { label: "Calls", done: 0, target: 250 },
            { label: "Qualified leads", done: 0, target: 80 },
            { label: "Applications", done: 0, target: 20 },
            { label: "Admissions", done: 0, target: 5 },
          ]),
  };

  teamMembers.unshift(newMember);
  if (isManager) {
    managers.unshift(newMember);
  } else {
    telecallers.unshift(newMember);
  }
  emit();
  return newMember;
}

export async function deleteTeamMember(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/team?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to delete team member." };
    }

    // 1. Remove from in-memory teamMembers
    const idx = teamMembers.findIndex((m) => m.id === id);
    let memberName = "";
    if (idx !== -1) {
      memberName = teamMembers[idx].name;
      teamMembers.splice(idx, 1);
    }

    // 2. Remove from telecallers or managers lists
    const tcIdx = telecallers.findIndex((t) => t.id === id);
    if (tcIdx !== -1) telecallers.splice(tcIdx, 1);

    const mgIdx = managers.findIndex((m) => m.id === id);
    if (mgIdx !== -1) managers.splice(mgIdx, 1);

    // 3. Reset any leads assigned to this member to null ("Yet to Assign")
    for (const lead of leads) {
      if (lead.assignedTo === id || (memberName && lead.assignedTo === memberName)) {
        lead.assignedTo = null;
      }
    }

    emit();
    return { success: true };
  } catch (err: any) {
    console.error("[deleteTeamMember error]:", err);
    return { success: false, error: err?.message || "Failed to delete team member." };
  }
}

export async function resetTeamMemberPassword(
  id: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to reset password." };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    console.error("[resetTeamMemberPassword error]:", err);
    return { success: false, error: err?.message || "Failed to reset password." };
  }
}

// ── ENTITY CREATION ───────────────────────────────────────────────────
export function createCampaign(input: Partial<Campaign>): Campaign {
  const branch: Branch =
    input.branch ||
    (input.name?.toLowerCase().includes("masters") ? "masters" : "mbbs");

  const newCamp: Campaign = {
    id: `cmp-${Date.now().toString().slice(-4)}`,
    name: input.name ?? "New Campaign",
    source: input.source ?? "Meta Ads",
    status: input.status ?? "Active",
    branch,
    startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: input.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    budget: input.budget ?? 100000,
    spend: input.spend ?? 0,
    leads: 0,
    qualified: 0,
    applications: 0,
    admissions: 0,
    revenue: 0,
  };
  campaigns.unshift(newCamp);
  emit();
  return newCamp;
}

export function createAssignmentRule(input: {
  name: string;
  type: string;
  scope: string;
}): AssignmentRule {
  const rule = {
    id: `ar-${Date.now().toString().slice(-4)}`,
    name: input.name,
    type: input.type,
    scope: input.scope,
    enabled: true,
  };
  assignmentRules.unshift(rule);
  emit();
  return rule;
}

export function createSource(name: string): LeadSourceItem {
  const source: LeadSourceItem = {
    name: name as LeadSource,
    enabled: true,
    leads: 0,
    contacted: 0,
    interested: 0,
    applications: 0,
    admissions: 0,
  };
  leadSources.unshift(source as any);
  emit();
  return source;
}

export function getReports() {
  return {
    bySource: leadSources.map((s) => ({
      name: s.name,
      leads: s.leads,
      admissions: s.admissions,
    })),
    byCampaign: campaigns.map((c) => ({
      name: c.name,
      leads: c.leads,
      admissions: c.admissions,
    })),
  };
}

// ── UTILITIES ────────────────────────────────────────────────────────
export const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};
export const formatDateTime = (iso: string) => {
  try {
    return `${formatDate(iso)} · ${new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return iso;
  }
};
export const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};
