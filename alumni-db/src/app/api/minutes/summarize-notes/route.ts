import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const { raw_text, agenda_item } = await req.json();
  if (!raw_text?.trim()) {
    return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `You are a meeting notes organizer for UP Alpha Sigma Fraternity Alumni Association. Given raw/unstructured notes for a specific agenda item, organize them and extract action items.

IMPORTANT: Return ONLY valid JSON. No explanation, no markdown, no extra text.

Return this exact JSON structure:
{
  "summary": "Organized notes using bullet points (•) for main points and (◦) for sub-details. Keep it concise. Remove filler words.",
  "action_items": [
    {
      "task": "What needs to be done",
      "assigned_to": "Person responsible (use actual name from notes, or null)",
      "due_date": "YYYY-MM-DD if mentioned, or null"
    }
  ]
}

Rules:
- Extract ALL action items: anything someone needs to do, follow up on, prepare, submit, etc.
- Look for phrases like: "will do", "needs to", "should", "to follow up", "assigned to", "by next week", "deadline", etc.
- Infer due dates from context (e.g., "by next week" = 7 days from now, "by Friday" = next Friday, "next meeting" = null)
- Today's date is ${new Date().toISOString().slice(0, 10)}
- Use actual names/nicknames from the text
- If no action items found, return empty array`,
      messages: [{
        role: "user",
        content: `Agenda item: "${agenda_item || "General discussion"}"\n\nRaw notes:\n${raw_text}`,
      }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  let parsed;
  try { parsed = JSON.parse(text); } catch {
    const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    try { parsed = JSON.parse(m?.[1] || m?.[0] || ""); } catch { /* */ }
  }

  if (!parsed) {
    return NextResponse.json({ summary: text, action_items: [] });
  }

  return NextResponse.json({
    summary: parsed.summary || text,
    action_items: parsed.action_items || [],
  });
}
