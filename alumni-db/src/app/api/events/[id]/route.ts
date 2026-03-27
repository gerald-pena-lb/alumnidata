import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(Number(id));
  if (!event) {
    db.close();
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const minutes = db.prepare("SELECT * FROM meeting_minutes WHERE event_id = ? ORDER BY date DESC").all(Number(id));
  const goals = db.prepare("SELECT * FROM goals WHERE event_id = ? ORDER BY created_at DESC").all(Number(id));
  const expenditures = db.prepare("SELECT * FROM expenditures WHERE event_id = ? ORDER BY date DESC").all(Number(id));
  db.close();
  return NextResponse.json({ ...event as object, minutes, goals, expenditures });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE events SET name = ?, description = ?, date = ?, type = ?, status = ?
    WHERE id = ?
  `).run(body.name, body.description || null, body.date, body.type, body.status, Number(id));

  db.close();
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM events WHERE id = ?").run(Number(id));
  db.close();
  return NextResponse.json({ success: true });
}
