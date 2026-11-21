// app/api/leads/meta-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMetaLeadForms,
  getMetaLeadsForForm,
  parseMetaLeadPayload,
  syncMetaLeadsToDatabase,
} from "@/lib/meta-leads";

export async function GET(req: NextRequest) {
  try {
    const token =
      req.nextUrl.searchParams.get("token") || process.env.META_MBBS_PAGE_ACCESS_TOKEN;
    const adAccountId =
      req.nextUrl.searchParams.get("adAccountId") || process.env.META_MBBS_AD_ACCOUNT_ID;

    if (!token) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: "META_MBBS_PAGE_ACCESS_TOKEN not set in environment or query params.",
      });
    }

    const formsResult = await getMetaLeadForms(token, adAccountId);

    return NextResponse.json({
      success: formsResult.success,
      configured: true,
      adAccountId: adAccountId || "Not set",
      forms: formsResult.forms,
      error: formsResult.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to inspect Meta connection." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || process.env.META_MBBS_PAGE_ACCESS_TOKEN;
    const adAccountId = body.adAccountId || process.env.META_MBBS_AD_ACCOUNT_ID;
    const branch = body.branch || "mbbs";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Meta Page Access Token. Please provide a valid token in the request or set META_MBBS_PAGE_ACCESS_TOKEN in .env.local.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch all forms
    const formsResult = await getMetaLeadForms(token, adAccountId);
    if (!formsResult.success && formsResult.forms.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: formsResult.error || "Could not retrieve forms from Meta.",
        },
        { status: 400 }
      );
    }

    const forms = formsResult.forms;
    if (forms.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active Lead Generation forms found on this Meta account/Page.",
        forms: [],
        totalFetched: 0,
        inserted: 0,
        duplicatesSkipped: 0,
      });
    }

    // 2. Fetch leads for each form
    let allParsedLeads: ReturnType<typeof parseMetaLeadPayload>[] = [];
    const formSummaries = [];

    for (const form of forms) {
      const leadsResult = await getMetaLeadsForForm(token, form.id);
      const rawLeads = leadsResult.leads || [];

      const parsed = rawLeads.map((r) => parseMetaLeadPayload(r, form.name, branch));
      allParsedLeads.push(...parsed);

      formSummaries.push({
        formId: form.id,
        formName: form.name,
        leadsFound: rawLeads.length,
      });
    }

    // 3. Ingest into MongoDB with phone deduplication
    const syncStats = await syncMetaLeadsToDatabase(allParsedLeads);

    return NextResponse.json({
      success: true,
      message: `Meta Ads Sync Complete: Found ${syncStats.total} total leads across ${forms.length} form(s). Ingested ${syncStats.inserted} new leads (${syncStats.skippedDuplicates} duplicates skipped).`,
      forms: formSummaries,
      totalFetched: syncStats.total,
      newLeadsInserted: syncStats.inserted,
      duplicatesSkipped: syncStats.skippedDuplicates,
      errors: syncStats.errorCount,
    });
  } catch (err: any) {
    console.error("[Meta Sync Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error during Meta sync." },
      { status: 500 }
    );
  }
}
