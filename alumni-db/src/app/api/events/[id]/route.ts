import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: event } = await supabase.from("events").select("*").eq("id", Number(id)).single();
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: minutes } = await supabase.from("meeting_minutes").select("*").eq("event_id", Number(id)).order("date", { ascending: false });
  const { data: goals } = await supabase.from("goals").select("*").eq("event_id", Number(id)).order("created_at", { ascending: false });
  const { data: expenditures } = await supabase.from("expenditures").select("*").eq("event_id", Number(id)).order("date", { ascending: false });

  return NextResponse.json({ ...event, minutes: minutes || [], goals: goals || [], expenditures: expenditures || [] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await supabase.from("events").update({
    name: body.name, description: body.description || null, date: body.date, type: body.type, status: body.status,
  }).eq("id", Number(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabase.from("events").delete().eq("id", Number(id));
  return NextResponse.json({ success: true });
}
