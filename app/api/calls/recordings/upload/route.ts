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
    
    // Preserve audio extension (.m4a, .mp3, .wav, .webm, etc.)
    const originalName = file.name || "recording.webm";
    let ext = path.extname(originalName).toLowerCase();
    if (!ext || ext.length < 2) {
      if (file.type.includes("m4a") || file.type.includes("mp4") || file.type.includes("aac")) ext = ".m4a";
      else if (file.type.includes("mp3") || file.type.includes("mpeg")) ext = ".mp3";
      else if (file.type.includes("wav")) ext = ".wav";
      else if (file.type.includes("ogg")) ext = ".ogg";
      else ext = ".webm";
    }

    const filename = `call_${cleanLeadId}_${Date.now()}${ext}`;
    const filePath = path.join(recordingsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const recordingUrl = `/recordings/${filename}`;
    const mimeType = file.type || (ext === ".m4a" ? "audio/mp4" : ext === ".mp3" ? "audio/mp3" : ext === ".wav" ? "audio/wav" : "audio/webm");

    return NextResponse.json({
      success: true,
      recordingUrl,
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      duration,
      base64: buffer.length < 15 * 1024 * 1024 ? buffer.toString("base64") : undefined,
    });
  } catch (error: any) {
    console.error("[Audio Upload API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save audio recording" },
      { status: 500 }
    );
  }
}
