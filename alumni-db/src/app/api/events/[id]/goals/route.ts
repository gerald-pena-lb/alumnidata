import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO goals (event_id, minute_id, description, status)
    VALUES (?, ?, ?, ?)
  `).run(Number(id), body.minute_id || null, body.description, body.status || "pending");

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE goals SET status = ? WHERE id = ?
  `).run(body.status, body.goal_id);

  db.close();
  return NextResponse.json({ success: true });
}
