import { MongoClient } from "mongodb";
import { dbConnect } from "@/lib/mongoose";
import LeadModel from "@/models/Lead";
import type { LeadSource, Branch } from "@/data/types";

const GVK_URI =
  process.env.GVKEDUTECH_MONGODB_URI ||
  "mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority";

let cachedClient: MongoClient | null = null;

async function getGvkDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(GVK_URI);
    await cachedClient.connect();
  }
  return cachedClient.db("gvkedutech");
}

function cleanPhone(raw: string): string {
  if (!raw) return "";
  const cleaned = String(raw).replace(/\D/g, "");
  if (cleaned.length === 10) return `+91 ${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2)}`;
  }
  return `+${cleaned}`;
}

export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function parseNeetScore(val: any): number | undefined {
  if (!val) return undefined;
  const cleaned = String(val).replace(/\D/g, "");
  if (!cleaned) return undefined;
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num <= 0 ? undefined : num;
}

const PLACEHOLDER_NAMES = [
  "google ads inquirer",
  "applicant",
  "predictor student",
  "budget inquirer",
  "comparison inquirer",
  "roi inquirer",
  "lead",
];

function isRealName(name?: string): boolean {
  if (!name || !name.trim()) return false;
  const lower = name.trim().toLowerCase();
  return !PLACEHOLDER_NAMES.some((p) => lower.includes(p));
}

export async function syncWebsiteSubmissions(): Promise<number> {
  let importedCount = 0;

  try {
    await dbConnect();
    const gvkDb = await getGvkDb();

    // 0. Fetch all existing leads and build phone lookup & submission ID cache
    const existingLeads = await LeadModel.find({}).lean();
    const phoneToLeadMap = new Map<string, any>();
    const existingSubmissionIds = new Set<string>();

    for (const lead of existingLeads) {
      const norm = normalizePhone(lead.phone);
      if (norm) {
        phoneToLeadMap.set(norm, lead);
      }
      if (lead.rawPayload?.submissionId) {
        existingSubmissionIds.add(String(lead.rawPayload.submissionId));
      }
      if (Array.isArray(lead.rawPayload?.allSubmissionIds)) {
        lead.rawPayload.allSubmissionIds.forEach((id: any) => existingSubmissionIds.add(String(id)));
      }
    }

    // 1. Parallel scan all 6 collections for valid submission IDs
    const collections = [
      "mbbs_abroad_submissions",
      "apply_submissions",
      "college_predictor_submissions",
      "budget_calculator_submissions",
      "smart_comparison_submissions",
      "roi_planner_submissions",
    ];

    const validSubmissionIds = new Set<string>();
    let scannedCollections = 0;

    await Promise.all(
      collections.map(async (colName) => {
        try {
          const idDocs = await gvkDb
            .collection(colName)
            .find({}, { projection: { _id: 1 } })
            .toArray();
          for (const doc of idDocs) {
            validSubmissionIds.add(String(doc._id));
          }
          scannedCollections++;
        } catch (colErr) {
          console.warn(`[Website Sync] Warning querying ids for ${colName}:`, colErr);
        }
      })
    );

    // 2. Reconcile deletions: remove any CRM leads whose underlying website submission was deleted
    if (scannedCollections === collections.length && validSubmissionIds.size > 0) {
      try {
        const deleteResult = await LeadModel.deleteMany({
          "rawPayload.submissionId": {
            $exists: true,
            $nin: Array.from(validSubmissionIds),
          },
          "rawPayload.allSubmissionIds": {
            $not: { $elemMatch: { $in: Array.from(validSubmissionIds) } },
          },
        });
        if (deleteResult.deletedCount && deleteResult.deletedCount > 0) {
          console.log(`[Website Sync] Reconciled deletions: removed ${deleteResult.deletedCount} leads.`);
        }
      } catch (delErr) {
        console.warn("[Website Sync] Deletion reconciliation error:", delErr);
      }
    }

    const newLeadsToInsert: any[] = [];

    // Helper: process a single submission document with strict mobile number deduplication
    const processSubmission = async (
      doc: any,
      submissionId: string,
      options: {
        source: LeadSource;
        course: string;
        country: string;
        branch: Branch;
        tags: string[];
        score: number;
        assignedTo?: string | null;
        formId: string;
        landingPage: string;
        utmCampaign: string;
        neetScore?: number;
        budget?: string;
        parentName?: string;
        university?: string;
        state?: string;
      }
    ) => {
      if (existingSubmissionIds.has(submissionId)) return;

      const phone = cleanPhone(doc.phone);
      if (!phone) return;
      const normPhone = normalizePhone(phone);
      if (!normPhone) return;

      const subName = doc.name || doc.fullName;

      // ── IF LEAD WITH THIS MOBILE NUMBER ALREADY EXISTS: MERGE & UPDATE ──
      if (phoneToLeadMap.has(normPhone)) {
        const existing = phoneToLeadMap.get(normPhone);
        existingSubmissionIds.add(submissionId);

        const updates: Record<string, any> = {};
        const currentTags = new Set(existing.tags || []);
        options.tags.forEach((t) => currentTags.add(t));
        updates.tags = Array.from(currentTags);

        if (!existing.neetScore && options.neetScore) updates.neetScore = options.neetScore;
        if ((!existing.budget || existing.budget === "₹25 Lakh") && options.budget) updates.budget = options.budget;
        if (!existing.parentName && options.parentName) updates.parentName = options.parentName;
        if (!existing.university && options.university) updates.university = options.university;
        if (!isRealName(existing.name) && isRealName(subName)) updates.name = subName;

        const raw = existing.rawPayload || {};
        const allSubIds = new Set(raw.allSubmissionIds || [raw.submissionId].filter(Boolean));
        allSubIds.add(submissionId);
        raw.allSubmissionIds = Array.from(allSubIds);
        raw.submissionCount = (raw.submissionCount || 1) + 1;
        updates.rawPayload = raw;
        updates.updatedAt = new Date();

        await LeadModel.updateOne({ _id: existing._id }, { $set: updates });
        return;
      }

      // ── NEW UNIQUE MOBILE NUMBER: CREATE LEAD ──
      const leadId = `GVK-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const name = subName || (options.source === "Google Ads" ? "Google Ads Inquirer" : "Website Inquirer");
      const email = doc.email || `${name.toLowerCase().replace(/\s+/g, ".")}.${phone.slice(-4)}@web-inquiry.com`;
      const state = options.state || doc.state || "Telangana";

      const newLead = {
        leadId,
        name,
        phone,
        email,
        city: doc.city || state,
        state,
        source: options.source,
        course: options.course,
        country: options.country,
        university: options.university,
        score: options.score,
        assignedTo: options.assignedTo ?? null,
        stage: "New",
        status: "New",
        tags: options.tags,
        neetScore: options.neetScore,
        budget: options.budget,
        parentName: options.parentName,
        branch: options.branch,
        attribution: {
          formId: options.formId,
          landingPage: options.landingPage,
          utmSource: options.source === "Google Ads" ? "google_ads" : "website",
          utmMedium: options.source === "Google Ads" ? "cpc" : "organic",
          utmCampaign: options.utmCampaign,
          utmTerm: options.formId,
          utmContent: doc.message || undefined,
        },
        rawPayload: { submissionId, allSubmissionIds: [submissionId], submissionCount: 1, ...doc },
        createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
        updatedAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      };

      newLeadsToInsert.push(newLead);
      phoneToLeadMap.set(normPhone, newLead);
      existingSubmissionIds.add(submissionId);
    };

    // 3. Ingest MBBS Abroad Landing Page submissions
    try {
      const mbbsDocs = await gvkDb
        .collection("mbbs_abroad_submissions")
        .find()
        .sort({ _id: -1 })
        .limit(200)
        .toArray();

      for (const doc of mbbsDocs) {
        const submissionId = String(doc._id);
        const country = doc.country ? String(doc.country).toUpperCase() : "Georgia";
        await processSubmission(doc, submissionId, {
          source: "Google Ads",
          course: "MBBS Abroad",
          country,
          branch: "mbbs",
          tags: ["MBBS Abroad Form", "Google Ads Landing", "NEET Qualified"],
          score: 95,
          assignedTo: null,
          formId: "MBBS Abroad Form",
          landingPage: "/mbbs-abroad",
          utmCampaign: "Google Ads MBBS Intake 2026",
          neetScore: parseNeetScore(doc.neetScore),
          budget: "₹22–28 L",
        });
      }
    } catch (err) {
      console.warn("[Website Sync] mbbs_abroad error:", err);
    }

    // 4. Ingest Apply Form submissions
    try {
      const applyDocs = await gvkDb
        .collection("apply_submissions")
        .find()
        .sort({ _id: -1 })
        .limit(200)
        .toArray();

      for (const doc of applyDocs) {
        const submissionId = String(doc._id);
        const country = doc.country ? String(doc.country) : "Kazakhstan";
        const isMasters = ["germany", "usa", "uk", "ireland", "canada", "australia"].some((c) =>
          country.toLowerCase().includes(c)
        );
        const branch: Branch = isMasters ? "masters" : "mbbs";

        await processSubmission(doc, submissionId, {
          source: "Website",
          course: isMasters ? "Masters Abroad" : "MBBS Abroad",
          country,
          branch,
          tags: ["Apply Form", "Website Lead", ...(isMasters ? ["Masters Lead"] : [])],
          score: 85,
          assignedTo: null,
          formId: "Apply Form",
          landingPage: "/apply",
          utmCampaign: "Website Application",
          parentName: doc.fatherName,
          budget: isMasters ? "₹35 L+" : "₹22–28 L",
        });
      }
    } catch (err) {
      console.warn("[Website Sync] apply_submissions error:", err);
    }

    // 5. Ingest College Predictor submissions
    try {
      const cpDocs = await gvkDb
        .collection("college_predictor_submissions")
        .find()
        .sort({ _id: -1 })
        .limit(300)
        .toArray();

      for (const doc of cpDocs) {
        const submissionId = String(doc._id);
        const neetScore = parseNeetScore(doc.neetScore);
        const state = doc.state || "Telangana";
        const country = doc.country && doc.country !== "all" ? String(doc.country) : "Kazakhstan";

        await processSubmission(doc, submissionId, {
          source: "Website",
          course: "MBBS Abroad",
          country,
          branch: "mbbs",
          tags: ["College Predictor", "Website Lead", ...(neetScore && neetScore >= 300 ? ["NEET Qualified"] : [])],
          score: neetScore && neetScore >= 350 ? 88 : 75,
          assignedTo: null,
          formId: "College Predictor",
          landingPage: "/",
          utmCampaign: "Website Tool · College Predictor",
          neetScore,
          budget: doc.budget ? `₹${doc.budget} Lakh` : "₹25 Lakh",
          state,
        });
      }
    } catch (err) {
      console.warn("[Website Sync] college_predictor error:", err);
    }

    // 6. Ingest Budget Calculator submissions
    try {
      const budgetDocs = await gvkDb
        .collection("budget_calculator_submissions")
        .find()
        .sort({ _id: -1 })
        .limit(300)
        .toArray();

      for (const doc of budgetDocs) {
        const submissionId = String(doc._id);
        const isMasters = String(doc.programType || "").toLowerCase().includes("master");
        const branch: Branch = isMasters ? "masters" : "mbbs";
        const state = doc.state || "Telangana";

        await processSubmission(doc, submissionId, {
          source: "Website",
          course: isMasters ? "Masters Abroad" : "MBBS Abroad",
          country: doc.country || (isMasters ? "Germany" : "Kazakhstan"),
          branch,
          tags: ["Budget Calculator", "Website Lead", ...(isMasters ? ["Masters Lead"] : [])],
          score: 80,
          assignedTo: null,
          formId: "Budget Calculator",
          landingPage: "/",
          utmCampaign: "Website Tool · Budget Calculator",
          university: doc.university,
          budget: doc.estimatedBudget || (isMasters ? "₹35 L+" : "₹25 Lakh"),
          state,
        });
      }
    } catch (err) {
      console.warn("[Website Sync] budget_calculator error:", err);
    }

    // 7. Ingest Smart Comparison submissions
    try {
      const compareDocs = await gvkDb
        .collection("smart_comparison_submissions")
        .find()
        .sort({ _id: -1 })
        .limit(200)
        .toArray();

      for (const doc of compareDocs) {
        const submissionId = String(doc._id);
        const isMasters = String(doc.courseType || "").toLowerCase().includes("master");
        const branch: Branch = isMasters ? "masters" : "mbbs";

        await processSubmission(doc, submissionId, {
          source: "Website",
          course: isMasters ? "Masters Abroad" : "MBBS Abroad",
          country: (doc.selectedItems && doc.selectedItems[0]) || (isMasters ? "Germany" : "Kazakhstan"),
          branch,
          tags: ["Smart Compare", "Website Lead", ...(isMasters ? ["Masters Lead"] : [])],
          score: 72,
          assignedTo: null,
          formId: "Smart Compare",
          landingPage: "/",
          utmCampaign: "Website Tool · Smart Compare",
          budget: isMasters ? "₹35 L+" : "₹22–28 L",
        });
      }
    } catch (err) {
      console.warn("[Website Sync] smart_comparison error:", err);
    }

    // 8. Ingest ROI Planner submissions
    try {
      const roiDocs = await gvkDb
        .collection("roi_planner_submissions")
        .find()
        .sort({ _id: -1 })
        .limit(200)
        .toArray();

      for (const doc of roiDocs) {
        const submissionId = String(doc._id);
        const isMasters = String(doc.courseType || "").toLowerCase().includes("master");
        const branch: Branch = isMasters ? "masters" : "mbbs";
        const neetScore = parseNeetScore(doc.neetScore);

        await processSubmission(doc, submissionId, {
          source: "Website",
          course: isMasters ? "Masters Abroad" : "MBBS Abroad",
          country: doc.country || (isMasters ? "Germany" : "Kazakhstan"),
          branch,
          tags: ["ROI Planner", "Website Lead", ...(isMasters ? ["Masters Lead"] : [])],
          score: 75,
          assignedTo: null,
          formId: "ROI Planner",
          landingPage: "/",
          utmCampaign: "Website Tool · ROI Planner",
          neetScore,
          budget: doc.budget ? `₹${(doc.budget / 100000).toFixed(0)} Lakh` : (isMasters ? "₹35 L+" : "₹25 Lakh"),
        });
      }
    } catch (err) {
      console.warn("[Website Sync] roi_planner error:", err);
    }

    // 9. Perform single bulk insert if any new leads were found
    if (newLeadsToInsert.length > 0) {
      try {
        await LeadModel.insertMany(newLeadsToInsert, { ordered: false });
        importedCount = newLeadsToInsert.length;
        console.log(`[Website Sync] Bulk imported ${importedCount} new unique website leads.`);
      } catch (bulkErr: any) {
        importedCount = bulkErr?.insertedDocs?.length || newLeadsToInsert.length;
      }
    }
  } catch (err) {
    console.error("[Website Sync] Fatal error syncing website database:", err);
  }

  return importedCount;
}
