import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import LeadModel from "@/models/Lead";
import { createLead, getLeads, getTelecallers, addTimelineEvent } from "@/services/api";
import type { LeadSource, Branch } from "@/data/types";

const VALID_TOKENS = new Set([
  "gvk_lead_capture_2026",
  "lead_capture_secret_2026",
  "lead_os_ingest_secret_2026",
]);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-ingest-token",
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "active",
      endpoint: "/api/leads/capture",
      description: "GVK Edutech Real-Time Lead Ingestion Webhook",
      acceptedSources: ["Google Ads", "Website"],
      supportedForms: [
        "MBBS Abroad Form -> Google Ads (MBBS)",
        "College Predictor -> Website (MBBS)",
        "Budget Calculator -> Website (MBBS / Masters)",
        "Smart Compare -> Website (MBBS / Masters)",
        "ROI Planner -> Website (MBBS / Masters)",
        "Apply Form -> Website (MBBS / Masters)",
      ],
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}


export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Token
    const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const apiKeyHeader = req.headers.get("x-api-key");
    const ingestTokenHeader = req.headers.get("x-ingest-token");
    const token = apiKeyHeader || ingestTokenHeader || authHeader;

    const envSecret = process.env.LEAD_CAPTURE_SECRET;
    if (envSecret) VALID_TOKENS.add(envSecret);

    if (!token || !VALID_TOKENS.has(token)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing API ingest token" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 2. Parse Incoming Payload
    const body = await req.json();
    const formId: string = body.formId || body.form_id || body.toolName || "Website Form";
    const data: Record<string, any> = body.data || body;

    // 3. Normalize Name & Phone
    const rawName = data.name || data.fullName || data.studentName || "Prospective Student";
    const name = String(rawName).trim();

    let phone = String(data.phone || data.mobile || "").trim();
    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
    if (!phone.startsWith("+")) {
      const cleaned = phone.replace(/\D/g, "");
      phone = cleaned.length === 10 ? `+91 ${cleaned}` : `+${cleaned}`;
    }

    const email = data.email && !data.email.includes("not-provided@")
      ? String(data.email).trim().toLowerCase()
      : `${name.toLowerCase().replace(/\s+/g, ".")}.${phone.slice(-4)}@web-inquiry.com`;

    const state = String(data.state || "Telangana").trim();
    const city = String(data.city || state || "Hyderabad").trim();
    const preferredCountry = String(data.preferredCountry || data.country || "").trim();
    const program = String(data.program || data.programType || data.courseType || data.course || "").trim();

    // 4. Source Classification per User Specification:
    // "and there is form in this route 'https://gvkedutech.com/mbbs-abroad' which is google ads form"
    // "labeling website leads and google leads"
    const isGoogleAds =
      formId === "MBBS Abroad Form" ||
      String(data.source || "").toLowerCase().includes("google") ||
      String(data.utmSource || "").toLowerCase().includes("google") ||
      String(data.utm_source || "").toLowerCase().includes("google") ||
      String(data.landingPage || "").includes("mbbs-abroad");

    const source: LeadSource = isGoogleAds ? "Google Ads" : "Website";

    // 5. Branch / Division Classification (MBBS vs Masters)
    const isMasters =
      program.toLowerCase().includes("master") ||
      String(data.course || "").toLowerCase().includes("master") ||
      ["germany", "usa", "uk", "ireland", "canada", "australia"].some((c) =>
        preferredCountry.toLowerCase().includes(c)
      ) && !isGoogleAds && formId !== "College Predictor";

    const branch: Branch = isMasters ? "masters" : "mbbs";
    const course = isMasters ? "Masters Abroad" : "MBBS Abroad";

    const country =
      preferredCountry && preferredCountry.toLowerCase() !== "all" && preferredCountry.toLowerCase() !== "any"
        ? preferredCountry
        : branch === "masters"
        ? "Germany"
        : "Kazakhstan";

    const neetScore = data.neetScore ? parseInt(String(data.neetScore), 10) : undefined;
    const budget = data.budget || data.estimatedBudget || (branch === "masters" ? "₹35 L+" : "₹22–28 L");

    // 6. Check for previous inquiries with same phone/email
    const existingLeads = getLeads();
    const existing = existingLeads.find((l) => {
      const matchPhone = l.phone.replace(/\D/g, "") === phone.replace(/\D/g, "");
      const matchEmail = email && l.email && l.email === email;
      return matchPhone || matchEmail;
    });

    const isRepeat = !!existing;
    if (existing) {
      addTimelineEvent(existing.id, {
        type: "lead",
        title: `Re-engaged via ${source} (${formId})`,
        detail: `Student re-submitted form: ${formId}. Country: ${country}. Program: ${course}`,
        actor: "Website Capture",
      });
    }


    // 7. Auto-Assign Telecaller from the target branch
    const branchTelecallers = getTelecallers(branch);
    let assignedTo: string | null = null;
    if (branchTelecallers.length > 0) {
      // Pick telecaller with least assigned or active presence
      const sorted = [...branchTelecallers].sort((a, b) => a.assigned - b.assigned);
      assignedTo = sorted[0].id;
    }

    // 8. Calculate Initial Propensity Score (0-100)
    let score = 50; // base score
    if (phone.length >= 10) score += 20; // verified phone
    if (data.email && !data.email.includes("web-inquiry")) score += 10;
    if (country && country !== "Kazakhstan" && country !== "Germany") score += 10;
    if (neetScore && neetScore >= 350) score += 10;
    if (isGoogleAds) score += 10; // High intent paid traffic
    score = Math.min(score, 98);

    // 9. Generate Tags
    const tags: string[] = [formId];
    if (isGoogleAds) tags.push("Google Ads Landing");
    else tags.push("Website Lead");
    if (neetScore && neetScore >= 300) tags.push("NEET Qualified");
    if (branch === "masters") tags.push("Masters Lead");
    if (isRepeat) tags.push("Repeat Enquiry");


    // 10. Generate Attribution Data
    const attribution = {
      formId,
      landingPage: isGoogleAds ? "/mbbs-abroad" : "/",
      utmSource: isGoogleAds ? "google_ads" : "website",
      utmMedium: isGoogleAds ? "cpc" : "organic",
      utmCampaign: isGoogleAds ? "Google Ads MBBS Intake 2026" : `Website Tool · ${formId}`,
      utmTerm: formId,
      utmContent: data.specialisation || data.livingPreference || data.comparisonType || undefined,
    };

    // 11. Ingest into Lead.OS Runtime Store
    const newLead = createLead({
      name,
      phone,
      email,
      city,
      state,
      source,
      branch,
      course,
      country,
      score,
      assignedTo,
      stage: assignedTo ? "Assigned" : "New",
      status: "New",
      tags,
      neetScore,
      budget,
      parentName: data.fatherName || data.parentName || undefined,
      attribution,
    });

    // 12. Persist to MongoDB (Async background execution)
    try {
      await dbConnect();
      await LeadModel.create({
        leadId: newLead.id,
        name: newLead.name,
        phone: newLead.phone,
        email: newLead.email,
        city: newLead.city,
        state: newLead.state,
        source: newLead.source,
        course: newLead.course,
        country: newLead.country,
        score: newLead.score,
        assignedTo: newLead.assignedTo,
        stage: newLead.stage,
        status: newLead.status,
        tags: newLead.tags,
        neetScore: newLead.neetScore,
        budget: newLead.budget,
        parentName: newLead.parentName,
        branch: newLead.branch,
        attribution: newLead.attribution,
        rawPayload: {
          submissionId:
            body.submissionId ||
            body.id ||
            body._id ||
            data.submissionId ||
            data.id ||
            data._id ||
            undefined,
          ...body,
        },
      });
    } catch (dbErr) {
      console.error("[Capture API] MongoDB sync warning (runtime memory retained):", dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lead successfully ingested and allocated",
        lead: {
          id: newLead.id,
          name: newLead.name,
          phone: newLead.phone,
          source: newLead.source,
          branch: newLead.branch,
          assignedTo: newLead.assignedTo,
          score: newLead.score,
        },
      },
      {
        status: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error: any) {
    console.error("[Capture API] Internal error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
