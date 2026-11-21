import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    const leadId = (formData.get("leadId") as string) || "unknown";
    const duration = (formData.get("duration") as string) || "0:00";

    if (!file) {
      return NextResponse.json({ success: false, error: "No audio file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/recordings
    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const cleanLeadId = leadId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `call_${cleanLeadId}_${Date.now()}.webm`;
    const filePath = path.join(recordingsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const recordingUrl = `/recordings/${filename}`;

    return NextResponse.json({
      success: true,
      recordingUrl,
      filename,
      size: buffer.length,
      duration,
    });
  } catch (error: any) {
    console.error("[Audio Upload API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save audio recording" },
      { status: 500 }
    );
  }
}
