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
  await supabase.from("meeting_summaries").update({
    title: body.title || null, meeting_date: body.meeting_date || null, location: body.location || null,
    participants: body.participants || [], updates: body.updates || [],
    action_items: body.action_items || [], previous_action_items: body.previous_action_items || [],
  }).eq("id", Number(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabase.from("meeting_summaries").delete().eq("id", Number(id));
  return NextResponse.json({ success: true });
}
