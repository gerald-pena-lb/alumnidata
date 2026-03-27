import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a meeting minutes parser for UP Alpha Sigma Fraternity Alumni Association.
Given raw meeting text (notes, transcripts, or informal minutes), extract and return a structured JSON summary.

IMPORTANT: You must return ONLY valid JSON. No explanation, no markdown, no extra text. Just the JSON object.

Look at the MOST RECENT previous meeting's action items (provided in context) to determine which ones are still pending vs completed based on mentions in the current meeting text.

Return this exact JSON structure:
{
  "title": "Brief descriptive title for this meeting (e.g. 'Monthly General Assembly - March 2026')",
  "meeting_date": "YYYY-MM-DD format if mentioned, or null",
  "location": "Meeting location/venue if mentioned, or null",
  "participants": [
    { "name": "Full Name", "role": "Role or position if mentioned, otherwise null" }
  ],
  "updates": [
    { "topic": "Brief topic title", "details": "Summary of the update/discussion", "by": "Person who gave the update if mentioned, otherwise null" }
  ],
  "action_items": [
    { "task": "Description of what needs to be done", "assigned_to": "Person responsible", "deadline": "Deadline if mentioned, otherwise null" }
  ],
  "previous_action_items": [
    { "task": "Original action item description", "assigned_to": "Person responsible", "status": "done or pending", "remarks": "Any update or reason if still pending" }
  ]
}

Rules:
- Extract ALL participants mentioned (attendees, speakers, anyone named)
- Identify action items clearly - who needs to do what
- For previous action items, only include them if prior meeting context is provided
- If the text mentions follow-ups from last meeting, map those to previous action items
- Be thorough but concise in summaries
- Use the actual names/nicknames as they appear in the text
- If something is ambiguous, make your best inference`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { raw_text } = await req.json();
  if (!raw_text || !raw_text.trim()) {
    return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
  }

  // Get previous meeting's action items for context
  let previousContext = "";
  const db = getDb();
  try {
    const prev = db.prepare(
      "SELECT action_items FROM meeting_summaries ORDER BY meeting_date DESC, created_at DESC LIMIT 1"
    ).get() as { action_items: string } | undefined;

    if (prev?.action_items) {
      const items = JSON.parse(prev.action_items);
      if (items.length > 0) {
        previousContext = `\n\nPREVIOUS MEETING ACTION ITEMS (for tracking follow-ups):\n${JSON.stringify(items, null, 2)}`;
      }
    }
  } finally {
    db.close();
  }

  const userMessage = `Parse the following meeting text into structured minutes:${previousContext}\n\nRAW MEETING TEXT:\n${raw_text}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic API error:", await response.text());
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  // Try parsing JSON from various formats
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const codeMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeMatch) {
      try {
        parsed = JSON.parse(codeMatch[1].trim());
      } catch { /* fall through */ }
    }
    // Try finding JSON object in text
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch { /* fall through */ }
      }
    }
  }

  if (!parsed) {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(parsed);
}
