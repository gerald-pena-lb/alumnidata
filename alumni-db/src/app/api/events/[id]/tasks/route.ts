import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase.from("tasks").select("*").eq("event_id", Number(id)).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from("tasks").insert({
    event_id: Number(id), title: body.title, description: body.description || null,
    section: body.section || null, assignee: body.assignee || null,
    priority: body.priority || "medium", status: body.status || "todo", due_date: body.due_date || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (body.status !== undefined && body.task_id) {
    await supabase.from("tasks").update({ status: body.status }).eq("id", body.task_id);
  } else if (body.task_id) {
    await supabase.from("tasks").update({
      title: body.title, description: body.description || null, section: body.section || null,
      assignee: body.assignee || null, priority: body.priority || "medium",
      status: body.status || "todo", due_date: body.due_date || null,
    }).eq("id", body.task_id);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { task_id } = await req.json();
  await supabase.from("tasks").delete().eq("id", task_id);
  return NextResponse.json({ success: true });
}
