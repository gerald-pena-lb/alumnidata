import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const eventId = new URL(req.url).searchParams.get("event_id");
  let query = supabase.from("expenditures").select("*, events(name)");
  if (eventId) query = query.eq("event_id", Number(eventId));
  const { data } = await query.order("date", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("expenditures").insert({
    description: body.description, amount: body.amount, date: body.date,
    event_id: body.event_id || null, remarks: body.remarks || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
