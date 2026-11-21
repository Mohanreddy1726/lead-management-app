import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      leadName = "Student",
      course = "MBBS Abroad",
      country = "Kazakhstan",
      transcript = "",
      duration = "2m 30s",
      recordingUrl = "",
    } = body;

    let audioBase64: string | undefined = body.audioBase64;
    let audioMimeType: string = body.audioMimeType || "audio/mp4";

    // If audioBase64 was not passed directly, try reading from disk if recordingUrl is provided
    if (!audioBase64 && recordingUrl) {
      try {
        const cleanPath = recordingUrl.replace(/^\/?recordings\//, "");
        const filePath = path.join(process.cwd(), "public", "recordings", cleanPath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.size <= 15 * 1024 * 1024) {
            const buf = fs.readFileSync(filePath);
            audioBase64 = buf.toString("base64");
            const ext = path.extname(filePath).toLowerCase();
            if (ext === ".m4a") audioMimeType = "audio/mp4";
            else if (ext === ".mp3") audioMimeType = "audio/mp3";
            else if (ext === ".wav") audioMimeType = "audio/wav";
            else if (ext === ".webm") audioMimeType = "audio/webm";
          }
        }
      } catch (e) {
        console.warn("[AI Summarize] Could not read recording file from disk:", e);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. If GEMINI_API_KEY is configured, call Gemini LLM API
    if (apiKey) {
      try {
        const prompt = `You are an AI Admissions Director analyzing a telecaller phone call recording with a student/parent.
Context:
- Student Name: ${leadName}
- Course of Interest: ${course}
- Target Country: ${country}
- Call Duration: ${duration}
${transcript ? `- Spoken Conversation Notes: "${transcript}"` : ""}

Analyze the dialogue spoken by both the telecaller and the student/parent in this call.
Provide your analysis strictly in valid JSON format matching this schema:
{
  "overview": "2-3 concise sentences summarizing what was discussed and the student's disposition.",
  "transcriptSummary": "Key dialogue summary of what both parties discussed.",
  "keyPoints": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "sentiment": "High Interest" | "Moderate" | "Hesitant" | "Budget Issue" | "Comparing",
  "suggestedOutcome": "Interested" | "Follow-up" | "Parent Discussion" | "Sent Fee Details" | "Not Interested",
  "suggestedFollowUp": "Specific recommended next action (e.g. Share Semey University 5-yr fee breakdown on WhatsApp)",
  "callbackDays": 1 or 2
}`;

        // Construct parts (multimodal audio + text)
        const parts: any[] = [];
        if (audioBase64) {
          parts.push({
            inlineData: {
              mimeType: audioMimeType,
              data: audioBase64,
            },
          });
          parts.push({
            text: `Please listen to the attached audio recording of this phone call. Understand both speakers carefully.\n\n${prompt}`,
          });
        } else {
          parts.push({ text: prompt });
        }

        const modelsToTry = [
          "gemini-3.5-flash-lite",
          "gemini-flash-latest",
          "gemini-1.5-flash",
        ];

        let parsed: any = null;

        for (const model of modelsToTry) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000);

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                signal: controller.signal,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts }],
                  generationConfig: { responseMimeType: "application/json" },
                }),
              }
            );

            clearTimeout(timer);

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                parsed = JSON.parse(rawText);
                break;
              }
            } else {
              console.warn(`Gemini model ${model} returned status ${geminiRes.status}`);
            }
          } catch (modelErr) {
            console.warn(`Gemini model ${model} fetch failed:`, modelErr);
          }
        }

        if (parsed) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + (parsed.callbackDays || 1));
          const followUpDateStr = tomorrow.toISOString().split("T")[0];

          return NextResponse.json({
            success: true,
            aiPowered: true,
            summary: {
              overview: parsed.overview,
              transcript: parsed.transcriptSummary || transcript,
              keyPoints: parsed.keyPoints || [],
              sentiment: parsed.sentiment || "High Interest",
              suggestedOutcome: parsed.suggestedOutcome || "Interested",
              suggestedFollowUp: parsed.suggestedFollowUp || "Share detailed university brochure and fee breakdown",
              followUpDate: followUpDateStr,
            },
          });
        }
      } catch (geminiErr) {
        console.warn("[AI Summarize] Gemini API warning, falling back to smart analyzer:", geminiErr);
      }
    }

    // 2. Built-in Smart Intelligent Analyzer (Native fallback when API key is not configured or offline)
    const lower = (transcript || "").toLowerCase();
    const isBudgetIssue = lower.includes("budget") || lower.includes("expensive") || lower.includes("fee") || lower.includes("cost") || lower.includes("lakh");
    const isParents = lower.includes("parent") || lower.includes("father") || lower.includes("mother") || lower.includes("dad") || lower.includes("family");
    const isReady = lower.includes("apply") || lower.includes("admission") || lower.includes("seat") || lower.includes("interested") || lower.includes("yes");
    const isNeet = lower.includes("neet") || lower.includes("score") || lower.includes("qualified") || lower.includes("marks");

    let sentiment = "High Interest";
    let suggestedOutcome = "Interested";
    let suggestedFollowUp = `Send ${country} fee structure & recognized university list on WhatsApp`;

    if (isParents) {
      sentiment = "Moderate";
      suggestedOutcome = "Parent Discussion";
      suggestedFollowUp = `Schedule parent callback to discuss ${course} intake in ${country}`;
    } else if (isBudgetIssue) {
      sentiment = "Budget Issue";
      suggestedOutcome = "Follow-up";
      suggestedFollowUp = `Send comparative budget packages (tuition + hostel + mess) for ${country}`;
    } else if (isReady) {
      sentiment = "High Interest";
      suggestedOutcome = "Interested";
      suggestedFollowUp = `Collect 10th/12th marksheet & passport copy for eligibility evaluation`;
    }

    const keyPoints: string[] = [];
    keyPoints.push(`Confirmed strong preference for ${course} in ${country}`);
    if (isNeet) keyPoints.push("Discussed NEET qualification requirements and admission cutoffs");
    if (isBudgetIssue) keyPoints.push("Requested clear year-wise fee breakdown including hostel and mess");
    if (isParents) keyPoints.push("Parent consultation or evening discussion requested before finalizing");
    if (keyPoints.length < 3) {
      keyPoints.push(`Call duration: ${duration} · Student engaged actively regarding admission timelines`);
    }

    const overview = `Student ${leadName} engaged positively regarding ${course} opportunities in ${country}. Discussed eligibility criteria, package estimates, and next application steps.`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const followUpDateStr = tomorrow.toISOString().split("T")[0];

    return NextResponse.json({
      success: true,
      aiPowered: false,
      summary: {
        overview,
        keyPoints,
        sentiment,
        suggestedOutcome,
        suggestedFollowUp,
        followUpDate: followUpDateStr,
      },
    });
  } catch (error: any) {
    console.error("[AI Summarize API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate AI summary" },
      { status: 500 }
    );
  }
}
