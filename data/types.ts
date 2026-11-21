export type Branch = "mbbs" | "masters";

export type LeadSource =
  | "Website"
  | "Meta Ads"
  | "Google Ads"
  | "WhatsApp"
  | "Manual"
  | "CSV Import";

export type LeadStage =
  | "New"
  | "Assigned"
  | "Contacted"
  | "Interested"
  | "Counselling"
  | "Application"
  | "Documentation"
  | "Admission"
  | "Converted";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Not Interested"
  | "Follow-up"
  | "Unreachable"
  | "Lost"
  | "Converted";

export type Role = "Super Admin" | "Admin" | "Manager" | "Telecaller";

export interface Attribution {
  formId?: string;
  adSet?: string;
  ad?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  source: LeadSource;
  campaignId: string | null;
  course: string;
  country: string;
  university?: string;
  score: number;
  scoreBreakdown: { label: string; points: number; earned: boolean }[];
  assignedTo: string | null;
  stage: LeadStage;
  status: LeadStatus;
  tags: string[];
  nextFollowUp: string | null;
  createdAt: string;
  neetScore?: number;
  budget?: string;
  parentName?: string;
  attribution: Attribution;
  branch?: Branch;
}

export type MemberPresence = "Active" | "On Break" | "Offline" | "Follow-up" | "Counselling" | "In Call";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Manager" | "Telecaller";
  branch?: Branch;
  team: string;
  avatarInitials: string;
  presence: MemberPresence;
  currentActivity: string;
  assigned: number;
  callsToday: number;
  followUps: number;
  interested: number;
  applications: number;
  admissions: number;
  revenue?: number;
  joinDate?: string;
  targets: { label: string; done: number; target: number }[];
}

export type Telecaller = TeamMember;

export interface Campaign {
  id: string;
  name: string;
  source: LeadSource;
  status: "Active" | "Paused" | "Completed";
  branch?: Branch;
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  leads: number;
  qualified: number;
  applications: number;
  admissions: number;
  revenue: number;
}

export interface CallLog {
  id: string;
  leadId: string;
  telecallerId: string;
  date: string;
  duration: string;
  outcome: string;
  notes: string;
  nextAction?: string;
  recordingUrl?: string;
  transcript?: string;
  aiSummary?: {
    overview: string;
    keyPoints?: string[];
    sentiment?: string;
    suggestedOutcome?: string;
    suggestedFollowUp?: string;
  };
}

export interface FollowUp {
  id: string;
  leadId: string;
  telecallerId: string;
  date: string;
  reason: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "Completed" | "Overdue";
}

export interface TimelineEvent {
  id: string;
  leadId: string;
  at: string;
  type: string;
  title: string;
  detail?: string;
  actor?: string;
  meta?: Record<string, string>;
}

export interface DocumentItem {
  leadId: string;
  name: string;
  status: "Not Requested" | "Requested" | "Received" | "Verified" | "Rejected";
  updatedAt?: string;
}

export interface Application {
  id: string;
  leadId: string;
  university: string;
  country: string;
  course: string;
  stage:
    | "Application Pending"
    | "Application Started"
    | "Documents Pending"
    | "Documents Verified"
    | "Submitted"
    | "University Processing"
    | "Offer Received"
    | "Admission";
  owner: string;
  updatedAt: string;
  intake: string;
}

export interface Admission {
  id: string;
  leadId: string;
  university: string;
  country: string;
  course: string;
  admissionDate: string;
  stage: "Offer Received" | "Admission Confirmed" | "Fee Payment" | "Pre-Departure" | "Completed";
  counsellor: string;
  feeStatus: "Pending" | "Partial" | "Paid";
}

export interface Payment {
  id: string;
  leadId: string;
  head: "University Fee" | "Consultancy Fee" | "Visa Fee" | "Hostel Fee" | "Other Charges";
  total: number;
  paid: number;
  dueDate: string;
  status: "Paid" | "Partial" | "Pending" | "Overdue";
}

export interface NotificationItem {
  id: string;
  type: "lead" | "followup" | "application" | "admission" | "system";
  title: string;
  detail: string;
  at: string;
  read: boolean;
  leadId?: string;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  leadId: string;
  module: string;
  at: string;
  from: string;
  to: string;
}

export interface CallScript {
  id: string;
  title: string;
  category: string;
  steps: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  when: string;
  then: string[];
  enabled: boolean;
  runs: number;
}

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
}

export interface CounsellingRecord {
  id: string;
  leadId: string;
  counsellor: string;
  course: string;
  country: string;
  university: string;
  date: string;
  status: "Pending" | "Scheduled" | "Completed" | "Follow-up Required";
  outcome?: string;
}

export interface AssignmentRule {
  id: string;
  name: string;
  type: string;
  scope: string;
  enabled: boolean;
}

export interface LeadSourceItem {
  name: LeadSource | string;
  enabled: boolean;
  leads: number;
  contacted: number;
  interested: number;
  applications: number;
  admissions: number;
}

export interface DuplicateGroup {
  id: string;
  matchOn: string;
  confidence: number;
  existing: Lead;
  incoming: Lead;
}
