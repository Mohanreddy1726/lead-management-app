// lib/meta-leads.ts
import { dbConnect } from "@/lib/mongoose";
import LeadModel from "@/models/Lead";
import { normalizePhone } from "@/lib/website-sync";
import type { Branch, LeadSource, LeadStage, LeadStatus } from "@/data/types";

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLeadRaw {
  id: string; // leadgen_id
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data?: MetaLeadField[];
}

export interface MetaForm {
  id: string;
  name: string;
  status?: string;
  leads_count?: number;
}

/**
 * Fetch all forms attached to a Page or Ad Account
 */
export async function getMetaLeadForms(
  token: string,
  adAccountId?: string
): Promise<{ success: boolean; forms: MetaForm[]; error?: string }> {
  try {
    const forms: MetaForm[] = [];

    // 1. Try querying via Ad Account
    if (adAccountId) {
      const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const url = `https://graph.facebook.com/v21.0/${actId}/leadgen_forms?fields=id,name,status,leads_count&limit=100&access_token=${encodeURIComponent(
        token
      )}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        forms.push(...data.data);
      }
    }

    // 2. If no forms from Ad Account or adAccountId not passed, try /me/leadgen_forms
    if (forms.length === 0) {
      const url = `https://graph.facebook.com/v21.0/me/leadgen_forms?fields=id,name,status,leads_count&limit=100&access_token=${encodeURIComponent(
        token
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        forms.push(...data.data);
      } else if (data.error && forms.length === 0) {
        return { success: false, forms: [], error: data.error.message };
      }
    }

    return { success: true, forms };
  } catch (err: any) {
    return { success: false, forms: [], error: err.message || "Failed to fetch Meta forms" };
  }
}

/**
 * Fetch all leads for a given Form ID, handling pagination
 */
export async function getMetaLeadsForForm(
  token: string,
  formId: string
): Promise<{ success: boolean; leads: MetaLeadRaw[]; error?: string }> {
  try {
    const allLeads: MetaLeadRaw[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v21.0/${formId}/leads?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data&limit=100&access_token=${encodeURIComponent(
      token
    )}`;

    while (nextUrl) {
      const res: Response = await fetch(nextUrl);
      const data: any = await res.json();

      if (data.error) {
        return { success: false, leads: allLeads, error: data.error.message };
      }

      if (data.data && Array.isArray(data.data)) {
        allLeads.push(...data.data);
      }

      nextUrl = data.paging?.next || null;
    }

    return { success: true, leads: allLeads };
  } catch (err: any) {
    return { success: false, leads: [], error: err.message || "Failed to fetch leads for form" };
  }
}

/**
 * Parse Meta Lead field_data into structured Lead fields
 */
export function parseMetaLeadPayload(raw: MetaLeadRaw, formName?: string, branch: Branch = "mbbs") {
  const fields: Record<string, string> = {};

  if (raw.field_data && Array.isArray(raw.field_data)) {
    for (const f of raw.field_data) {
      const key = f.name.toLowerCase().trim();
      const val = f.values?.[0]?.trim() || "";
      fields[key] = val;
    }
  }

  // Name extraction
  const fullName =
    fields["full_name"] ||
    fields["name"] ||
    fields["student_name"] ||
    (fields["first_name"] ? `${fields["first_name"]} ${fields["last_name"] || ""}`.trim() : "") ||
    "Meta Ads Lead";

  // Phone extraction
  let rawPhone =
    fields["phone_number"] ||
    fields["phone"] ||
    fields["mobile_number"] ||
    fields["contact_number"] ||
    fields["whatsapp_number"] ||
    "";

  let phone = rawPhone.trim();
  if (phone) {
    if (!phone.startsWith("+")) {
      const cleaned = phone.replace(/\D/g, "");
      phone = cleaned.length === 10 ? `+91 ${cleaned}` : `+${cleaned}`;
    }
  }

  // Email extraction
  const email =
    fields["email"] ||
    fields["email_address"] ||
    (phone ? `${fullName.toLowerCase().replace(/\s+/g, ".")}.${phone.replace(/\D/g, "").slice(-4)}@meta-lead.com` : "");

  // City & State
  const city = fields["city"] || fields["location"] || fields["current_city"] || "Hyderabad";
  const state = fields["state"] || fields["region"] || "Telangana";

  // NEET Score
  const neetRaw = fields["neet_score"] || fields["neet_marks"] || fields["neet"] || fields["score"];
  const neetScore = neetRaw ? parseInt(neetRaw.replace(/\D/g, ""), 10) : undefined;

  // Budget & Preferences
  const budget = fields["budget"] || fields["estimated_budget"] || (branch === "masters" ? "₹35 L+" : "₹22–28 L");
  const preferredCountry = fields["preferred_country"] || fields["country"] || (branch === "masters" ? "Germany" : "Kazakhstan");
  const parentName = fields["father_name"] || fields["parent_name"] || fields["guardian_name"];

  const course = branch === "masters" ? "Masters Abroad" : "MBBS Abroad";

  // Scoring
  let score = 65; // Base high score for Meta Ad Instant Forms
  if (phone && phone.length >= 10) score += 15;
  if (email && !email.includes("@meta-lead.com")) score += 10;
  if (neetScore && neetScore >= 300) score += 10;
  score = Math.min(score, 98);

  // Tags
  const tags: string[] = ["Meta Ads", formName || "Instant Form"];
  if (raw.campaign_name) tags.push(raw.campaign_name);
  if (neetScore && neetScore >= 300) tags.push("NEET Qualified");
  if (branch === "masters") tags.push("Masters Lead");

  return {
    leadId: `lead-meta-${raw.id || Date.now()}`,
    metaLeadId: raw.id,
    name: fullName,
    phone,
    email,
    city,
    state,
    source: "Meta Ads" as LeadSource,
    branch,
    course,
    country: preferredCountry,
    score,
    assignedTo: null, // "Yet to Assign"
    stage: "New" as LeadStage,
    status: "New" as LeadStatus,
    tags,
    neetScore,
    budget,
    parentName,
    createdAt: raw.created_time ? new Date(raw.created_time) : new Date(),
    attribution: {
      formId: formName || raw.form_id || "Meta Instant Form",
      landingPage: "Instagram / Facebook Instant Form",
      utmSource: "meta_ads",
      utmMedium: "paid_social",
      utmCampaign: raw.campaign_name || "Meta MBBS Campaign",
      utmContent: raw.ad_name || undefined,
      utmTerm: raw.adset_name || undefined,
    },
    rawPayload: raw,
  };
}

/**
 * Ingest parsed leads into MongoDB Atlas with phone deduplication
 */
export async function syncMetaLeadsToDatabase(
  parsedLeads: ReturnType<typeof parseMetaLeadPayload>[]
): Promise<{ total: number; inserted: number; skippedDuplicates: number; errorCount: number }> {
  await dbConnect();

  let inserted = 0;
  let skippedDuplicates = 0;
  let errorCount = 0;

  for (const lead of parsedLeads) {
    try {
      const normPhone = normalizePhone(lead.phone);
      if (!normPhone) {
        errorCount++;
        continue;
      }

      // Check if lead with this phone already exists in DB
      const existing = await LeadModel.findOne({
        $or: [
          { phone: lead.phone },
          { phone: { $regex: normPhone.slice(-10) + "$" } },
          { "rawPayload.id": lead.metaLeadId },
        ],
      });

      if (existing) {
        skippedDuplicates++;
        continue;
      }

      await LeadModel.create({
        leadId: lead.leadId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        state: lead.state,
        source: lead.source,
        branch: lead.branch,
        course: lead.course,
        country: lead.country,
        score: lead.score,
        assignedTo: null, // "Yet to Assign"
        stage: lead.stage,
        status: lead.status,
        tags: lead.tags,
        neetScore: lead.neetScore,
        budget: lead.budget,
        parentName: lead.parentName,
        attribution: lead.attribution,
        rawPayload: lead.rawPayload,
        createdAt: lead.createdAt,
      });

      inserted++;
    } catch (err) {
      console.error("[Meta Ingest Error for lead]:", lead.name, err);
      errorCount++;
    }
  }

  return {
    total: parsedLeads.length,
    inserted,
    skippedDuplicates,
    errorCount,
  };
}
