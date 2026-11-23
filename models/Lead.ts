import mongoose, { Schema, Document } from "mongoose";
import type { LeadSource, LeadStage, LeadStatus, Branch } from "@/data/types";

export interface ILeadDocument extends Document {
  leadId: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  source: LeadSource;
  campaignId?: string | null;
  course: string;
  country: string;
  university?: string;
  score: number;
  scoreBreakdown?: { label: string; points: number; earned: boolean }[];
  assignedTo?: string | null;
  stage: LeadStage;
  status: LeadStatus;
  tags: string[];
  nextFollowUp?: string | null;
  neetScore?: number;
  budget?: string;
  parentName?: string;
  branch: Branch;
  contactCount?: number;
  lastContactedAt?: Date | null;
  attribution?: {
    adSet?: string;
    ad?: string;
    landingPage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    formId?: string;
  };
  rawPayload?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema<ILeadDocument> = new Schema(
  {
    leadId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    city: { type: String, default: "Hyderabad" },
    state: { type: String, default: "Telangana" },
    source: {
      type: String,
      enum: ["Website", "Meta Ads", "Google Ads", "WhatsApp", "Manual", "CSV Import"],
      default: "Website",
      index: true,
    },
    campaignId: { type: String, default: null },
    course: { type: String, default: "MBBS Abroad" },
    country: { type: String, default: "Kazakhstan" },
    university: { type: String },
    score: { type: Number, default: 50 },
    scoreBreakdown: [
      {
        label: { type: String },
        points: { type: Number },
        earned: { type: Boolean },
      },
    ],
    assignedTo: { type: String, default: null, index: true },
    stage: {
      type: String,
      enum: [
        "New",
        "Assigned",
        "Contacted",
        "Interested",
        "Counselling",
        "Application",
        "Documentation",
        "Admission",
        "Converted",
      ],
      default: "New",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Interested",
        "Not Interested",
        "Follow-up",
        "Unreachable",
        "Lost",
        "Converted",
      ],
      default: "New",
    },
    tags: [{ type: String }],
    nextFollowUp: { type: String, default: null },
    neetScore: { type: Number },
    budget: { type: String },
    parentName: { type: String },
    contactCount: { type: Number, default: 0 },
    lastContactedAt: { type: Date, default: null },
    branch: {
      type: String,
      enum: ["mbbs", "masters"],
      default: "mbbs",
      index: true,
    },
    attribution: {
      adSet: String,
      ad: String,
      landingPage: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      utmTerm: String,
      utmContent: String,
      formId: String,
    },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

LeadSchema.index({ "rawPayload.submissionId": 1 });

export default mongoose.models.Lead || mongoose.model<ILeadDocument>("Lead", LeadSchema);

