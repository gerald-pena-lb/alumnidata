import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const tasks = db.prepare("SELECT * FROM tasks WHERE event_id = ? ORDER BY priority DESC, created_at DESC").all(Number(id));
  db.close();
  return NextResponse.json(tasks);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO tasks (event_id, title, description, assignee, priority, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(id),
    body.title,
    body.description || null,
    body.assignee || null,
    body.priority || "medium",
    body.status || "todo",
    body.due_date || null
  );

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  if (body.status !== undefined && body.task_id) {
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(body.status, body.task_id);
  } else if (body.task_id) {
    db.prepare(`
      UPDATE tasks SET title = ?, description = ?, assignee = ?, priority = ?, status = ?, due_date = ?
      WHERE id = ?
    `).run(
      body.title,
      body.description || null,
      body.assignee || null,
      body.priority || "medium",
      body.status || "todo",
      body.due_date || null,
      body.task_id
    );
  }

  db.close();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { task_id } = await req.json();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(task_id);
  db.close();
  return NextResponse.json({ success: true });
}
