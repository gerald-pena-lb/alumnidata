import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a meeting minutes parser for UP Alpha Sigma Fraternity Alumni Association.
Given raw meeting text (notes, transcripts, or informal minutes), extract and return a structured JSON summary.

IMPORTANT: You must return ONLY valid JSON. No explanation, no markdown, no extra text. Just the JSON object.

Look at the MOST RECENT previous meeting's action items (provided in context) to determine which ones are still pending vs completed based on mentions in the current meeting text.

Return this exact JSON structure:
{
  "title": "Brief descriptive title for this meeting",
  "meeting_date": "YYYY-MM-DD format if mentioned, or null",
  "location": "Meeting location/venue if mentioned, or null",
  "participants": [{ "name": "Full Name", "role": "Role or null" }],
  "updates": [{ "topic": "Brief topic", "details": "Summary", "by": "Person or null" }],
  "action_items": [{ "task": "What needs to be done", "assigned_to": "Person", "deadline": "Deadline or null" }],
  "previous_action_items": [{ "task": "Original task", "assigned_to": "Person", "status": "done or pending", "remarks": "Update or null" }]
}

Rules:
- Extract ALL participants mentioned
- Identify action items clearly
- For previous action items, only include if prior meeting context is provided
- Be thorough but concise
- Use actual names/nicknames as they appear`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

  const { raw_text } = await req.json();
  if (!raw_text?.trim()) return NextResponse.json({ error: "raw_text is required" }, { status: 400 });

  let previousContext = "";
  const { data: prev } = await supabase
    .from("meeting_summaries")
    .select("action_items")
    .order("meeting_date", { ascending: false })
    .limit(1)
    .single();

  if (prev?.action_items && Array.isArray(prev.action_items) && prev.action_items.length > 0) {
    previousContext = `\n\nPREVIOUS MEETING ACTION ITEMS:\n${JSON.stringify(prev.action_items, null, 2)}`;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 2048, system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Parse the following meeting text:${previousContext}\n\nRAW TEXT:\n${raw_text}` }],
    }),
  });

  if (!response.ok) return NextResponse.json({ error: "AI service error" }, { status: 502 });
  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  let parsed;
  try { parsed = JSON.parse(text); } catch {
    const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    try { parsed = JSON.parse(m?.[1] || m?.[0] || ""); } catch { /* */ }
  }
  if (!parsed) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  return NextResponse.json(parsed);
}
