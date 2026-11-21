// app/api/webhooks/meta/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseMetaLeadPayload, syncMetaLeadsToDatabase } from "@/lib/meta-leads";

const VERIFY_TOKEN =
  process.env.META_WEBHOOK_VERIFY_TOKEN ||
  process.env.LEAD_CAPTURE_SECRET ||
  "meta_webhook_secret_2026";

/**
 * 1. Webhook Verification for Meta App Dashboard
 * When setting up Webhooks in Meta for Developers:
 * Webhook URL: https://<your-domain>/api/webhooks/meta
 * Verify Token: meta_webhook_secret_2026 (or your LEAD_CAPTURE_SECRET)
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Meta Webhook] Successfully verified webhook subscription.");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden: Invalid verification token" }, { status: 403 });
}

/**
 * 2. Real-Time Lead Event Receiver
 * Whenever a user submits a Meta Lead Gen form, Meta sends a POST request here
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "page") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const token = process.env.META_MBBS_PAGE_ACCESS_TOKEN;
    if (!token) {
      console.warn("[Meta Webhook] META_MBBS_PAGE_ACCESS_TOKEN not configured.");
      return NextResponse.json({ error: "Missing page access token" }, { status: 200 });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen") {
          const leadgenId = change.value?.leadgen_id;
          const formId = change.value?.form_id;

          if (leadgenId) {
            console.log(`[Meta Webhook] New lead received: ID ${leadgenId}, Form: ${formId}`);

            // Fetch full lead details from Meta Graph API
            const fetchUrl = `https://graph.facebook.com/v21.0/${leadgenId}?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data&access_token=${encodeURIComponent(
              token
            )}`;

            try {
              const res = await fetch(fetchUrl);
              const rawLead = await res.json();

              if (!rawLead.error) {
                const parsed = parseMetaLeadPayload(rawLead, "Meta Instant Form", "mbbs");
                await syncMetaLeadsToDatabase([parsed]);
                console.log(`[Meta Webhook] Ingested live lead: ${parsed.name} (${parsed.phone})`);
              } else {
                console.error("[Meta Webhook] Error fetching leadgen data:", rawLead.error);
              }
            } catch (fetchErr) {
              console.error("[Meta Webhook] Network error fetching lead:", fetchErr);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Meta Webhook] Handler error:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
