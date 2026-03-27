import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams.get("search");
  let query = supabase.from("meeting_summaries").select("id, title, meeting_date, location, participants, agenda, created_at");
  if (search) query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  const { data } = await query.order("meeting_date", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("meeting_summaries").insert({
    raw_text: body.raw_text || "",
    title: body.title || null,
    meeting_date: body.meeting_date || null,
    location: body.location || null,
    participants: body.participants || [],
    updates: body.updates || [],
    action_items: body.action_items || [],
    previous_action_items: body.previous_action_items || [],
    agenda: body.agenda || [],
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
