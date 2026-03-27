import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const eventId = url.searchParams.get("event_id");

  let query = `
    SELECT e.*, ev.name as event_name
    FROM expenditures e
    LEFT JOIN events ev ON e.event_id = ev.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (eventId) {
    query += " AND e.event_id = ?";
    params.push(Number(eventId));
  }
  query += " ORDER BY e.date DESC";

  const expenditures = db.prepare(query).all(...params);
  db.close();
  return NextResponse.json(expenditures);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO expenditures (description, amount, date, event_id, remarks)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    body.description,
    body.amount,
    body.date,
    body.event_id || null,
    body.remarks || null
  );

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
