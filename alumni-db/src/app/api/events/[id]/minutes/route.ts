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
    INSERT INTO meeting_minutes (event_id, date, content)
    VALUES (?, ?, ?)
  `).run(Number(id), body.date, body.content);

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
