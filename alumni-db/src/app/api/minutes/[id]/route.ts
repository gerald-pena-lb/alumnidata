import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM meeting_summaries WHERE id = ?").get(Number(id)) as Record<string, unknown> | undefined;
  db.close();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...row,
    participants: JSON.parse((row.participants as string) || "[]"),
    updates: JSON.parse((row.updates as string) || "[]"),
    action_items: JSON.parse((row.action_items as string) || "[]"),
    previous_action_items: JSON.parse((row.previous_action_items as string) || "[]"),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE meeting_summaries
    SET title = ?, meeting_date = ?, location = ?, participants = ?, updates = ?, action_items = ?, previous_action_items = ?
    WHERE id = ?
  `).run(
    body.title || null,
    body.meeting_date || null,
    body.location || null,
    JSON.stringify(body.participants || []),
    JSON.stringify(body.updates || []),
    JSON.stringify(body.action_items || []),
    JSON.stringify(body.previous_action_items || []),
    Number(id)
  );

  db.close();
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM meeting_summaries WHERE id = ?").run(Number(id));
  db.close();
  return NextResponse.json({ success: true });
}
