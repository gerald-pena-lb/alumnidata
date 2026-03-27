import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase.from("meeting_summaries").select("*").eq("id", Number(id)).single();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.meeting_date !== undefined) updates.meeting_date = body.meeting_date;
  if (body.location !== undefined) updates.location = body.location;
  if (body.participants !== undefined) updates.participants = body.participants;
  if (body.updates !== undefined) updates.updates = body.updates;
  if (body.action_items !== undefined) updates.action_items = body.action_items;
  if (body.previous_action_items !== undefined) updates.previous_action_items = body.previous_action_items;
  if (body.agenda !== undefined) updates.agenda = body.agenda;
  if (body.raw_text !== undefined) updates.raw_text = body.raw_text;

  await supabase.from("meeting_summaries").update(updates).eq("id", Number(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabase.from("meeting_summaries").delete().eq("id", Number(id));
  return NextResponse.json({ success: true });
}
