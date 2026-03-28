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
      system: `You are a meeting notes organizer for UP Alpha Sigma Fraternity Alumni Association. Given raw/unstructured notes for a specific agenda item, organize and summarize them into clean, concise bullet points.

Rules:
- Keep it brief and structured
- Use bullet points (•) for main points
- Use sub-bullets (  ◦) for details
- Preserve key decisions, names, numbers, and dates
- Remove filler words and redundancy
- If there are action items mentioned, mark them with [ACTION]
- Return ONLY the organized notes, no preamble or explanation`,
      messages: [{
        role: "user",
        content: `Agenda item: "${agenda_item || "General discussion"}"\n\nRaw notes to organize:\n${raw_text}`,
      }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  const summary = data.content?.[0]?.text || raw_text;

  return NextResponse.json({ summary });
}
