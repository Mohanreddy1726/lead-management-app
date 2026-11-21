import { NextRequest, NextResponse } from "next/server";

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
    } = body;

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
- Spoken Conversation Transcript: "${transcript || "Discussed admissions eligibility, budget requirements, university fee packages, hostel amenities, and next documentation steps."}"

Provide your analysis strictly in valid JSON format matching this schema:
{
  "overview": "2-3 concise sentences summarizing what was discussed and the student's disposition.",
  "keyPoints": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "sentiment": "High Interest" | "Moderate" | "Hesitant" | "Budget Issue" | "Comparing",
  "suggestedOutcome": "Interested" | "Follow-up" | "Parent Discussion" | "Sent Fee Details" | "Not Interested",
  "suggestedFollowUp": "Specific recommended next action (e.g. Share Semey University 5-yr fee breakdown on WhatsApp)",
  "callbackDays": 1 or 2 (number of days from today for next callback)
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + (parsed.callbackDays || 1));
            const followUpDateStr = tomorrow.toISOString().split("T")[0];

            return NextResponse.json({
              success: true,
              aiPowered: true,
              summary: {
                overview: parsed.overview,
                keyPoints: parsed.keyPoints || [],
                sentiment: parsed.sentiment || "High Interest",
                suggestedOutcome: parsed.suggestedOutcome || "Interested",
                suggestedFollowUp: parsed.suggestedFollowUp || "Share detailed university brochure and fee breakdown",
                followUpDate: followUpDateStr,
              },
            });
          }
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
