import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import LeadModel from "@/models/Lead";
import { syncWebsiteSubmissions } from "@/lib/website-sync";
import type { Lead, Branch } from "@/data/types";

let lastSyncTime = 0;
let isSyncInProgress = false;
const SYNC_COOLDOWN_MS = 20000; // At most once every 20 seconds

async function runSyncIfNeeded(force = false) {
  const now = Date.now();
  if (isSyncInProgress) return;
  if (!force && now - lastSyncTime < SYNC_COOLDOWN_MS) return;

  isSyncInProgress = true;
  lastSyncTime = now;
  try {
    await syncWebsiteSubmissions();
  } catch (syncErr) {
    console.warn("[Leads API] Background website sync warning:", syncErr);
  } finally {
    isSyncInProgress = false;
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const forceSync = req.nextUrl.searchParams.get("sync") === "true";
    if (forceSync) {
      await runSyncIfNeeded(true);
    } else {
      // Trigger background sync asynchronously without holding the HTTP response
      runSyncIfNeeded(false).catch(() => {});
    }

    const branch = req.nextUrl.searchParams.get("branch") as Branch | null;



    const filter: Record<string, any> = {};
    if (branch && (branch === "mbbs" || branch === "masters")) {
      filter.branch = branch;
    }

    const docs = await LeadModel.find(filter).sort({ createdAt: -1 }).lean();

    // Deduplicate by normalized 10-digit mobile number scoped to division branch
    const seenPhones = new Set<string>();
    const uniqueDocs: any[] = [];
    for (const doc of docs) {
      const digits = String(doc.phone || "").replace(/\D/g, "");
      const norm = digits.length >= 10 ? digits.slice(-10) : digits;
      const key = `${norm}_${doc.branch || "mbbs"}`;
      if (!norm || !seenPhones.has(key)) {
        if (norm) seenPhones.add(key);
        uniqueDocs.push(doc);
      }
    }

    const leads: Lead[] = uniqueDocs.map((doc: any) => ({
      id: doc.leadId || String(doc._id),
      name: doc.name,
      phone: doc.phone,
      email: doc.email || "",
      city: doc.city || "Hyderabad",
      state: doc.state || "Telangana",
      source: doc.source || "Website",
      campaignId: doc.campaignId ?? null,
      course: doc.course || (doc.branch === "masters" ? "Masters Abroad" : "MBBS Abroad"),
      country: doc.country || (doc.branch === "masters" ? "Germany" : "Kazakhstan"),
      university: doc.university,
      score: doc.score ?? 70,
      scoreBreakdown: doc.scoreBreakdown || [],
      assignedTo: doc.assignedTo ?? null,
      stage: doc.stage || "New",
      status: doc.status || "New",
      tags: doc.tags || [],
      nextFollowUp: doc.nextFollowUp ?? null,
      neetScore: doc.neetScore,
      budget: doc.budget,
      parentName: doc.parentName,
      branch: doc.branch || "mbbs",
      contactCount: doc.contactCount ?? 0,
      lastContactedAt: doc.lastContactedAt ? new Date(doc.lastContactedAt).toISOString() : null,
      attribution: doc.attribution,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      total: leads.length,
      leads,
    });
  } catch (error: any) {
    console.error("[Leads GET API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: false, error: "No lead IDs provided" }, { status: 400 });
    }

    const filter: Record<string, any>[] = [{ leadId: { $in: ids } }];
    const validObjectIds = ids.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
    if (validObjectIds.length > 0) {
      filter.push({ _id: { $in: validObjectIds } });
    }

    const result = await LeadModel.deleteMany({ $or: filter });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("[Leads DELETE API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete leads" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { leadIds, assignedTo, stage, assignments } = body;

    // 1. Batch individual assignments (e.g. distributed across multiple telecallers)
    if (assignments && Array.isArray(assignments)) {
      let updatedCount = 0;
      for (const item of assignments) {
        if (!item.leadId || !item.assignedTo) continue;
        const res = await LeadModel.updateMany(
          {
            $or: [
              { leadId: item.leadId },
              ...(item.leadId.length === 24 ? [{ _id: item.leadId }] : []),
            ],
          },
          {
            $set: {
              assignedTo: item.assignedTo,
              stage: item.stage || "Assigned",
            },
          }
        );
        updatedCount += res.modifiedCount;
      }
      return NextResponse.json({
        success: true,
        count: updatedCount,
        message: `Successfully distributed ${updatedCount} leads.`,
      });
    }

    // 2. Bulk assign to single telecaller
    const ids: string[] = leadIds || (body.id ? [body.id] : []);
    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No lead IDs provided for assignment" },
        { status: 400 }
      );
    }

    const filter: Record<string, any>[] = [{ leadId: { $in: ids } }];
    const validObjectIds = ids.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
    if (validObjectIds.length > 0) {
      filter.push({ _id: { $in: validObjectIds } });
    }

    const updateFields: Record<string, any> = {};
    if (assignedTo !== undefined) {
      updateFields.assignedTo = assignedTo;
      updateFields.stage = assignedTo ? (stage || "Assigned") : "New";
    }
    if (stage) {
      updateFields.stage = stage;
    }
    if (body.status) {
      updateFields.status = body.status;
    }
    if (body.contactCount !== undefined) {
      updateFields.contactCount = body.contactCount;
    }
    if (body.lastContactedAt) {
      updateFields.lastContactedAt = body.lastContactedAt;
    }

    const result = await LeadModel.updateMany({ $or: filter }, { $set: updateFields });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Successfully assigned ${result.modifiedCount} lead(s) to ${assignedTo || "Yet to Assign"}.`,
    });
  } catch (error: any) {
    console.error("[Leads PATCH API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update leads" },
      { status: 500 }
    );
  }
}
