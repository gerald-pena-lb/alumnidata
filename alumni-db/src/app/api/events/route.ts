import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  let query = "SELECT * FROM events WHERE 1=1";
  const params: unknown[] = [];

  if (type) {
    query += " AND type = ?";
    params.push(type);
  }
  query += " ORDER BY date DESC";

  const events = db.prepare(query).all(...params);
  db.close();
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO events (name, description, date, type, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    body.name,
    body.description || null,
    body.date,
    body.type || "event",
    body.status || "upcoming"
  );

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
