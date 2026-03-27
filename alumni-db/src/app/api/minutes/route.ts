import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const search = url.searchParams.get("search");

  let query = "SELECT id, title, meeting_date, location, participants, created_at FROM meeting_summaries";
  const params: unknown[] = [];

  if (search) {
    query += " WHERE (title LIKE ? OR location LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  query += " ORDER BY meeting_date DESC, created_at DESC";

  const rows = db.prepare(query).all(...params);
  db.close();

  const results = (rows as Record<string, unknown>[]).map((r) => ({
    ...r,
    participants: JSON.parse((r.participants as string) || "[]"),
  }));

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO meeting_summaries (raw_text, title, meeting_date, location, participants, updates, action_items, previous_action_items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.raw_text,
    body.title || null,
    body.meeting_date || null,
    body.location || null,
    JSON.stringify(body.participants || []),
    JSON.stringify(body.updates || []),
    JSON.stringify(body.action_items || []),
    JSON.stringify(body.previous_action_items || [])
  );

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
