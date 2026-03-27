import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type");
  let query = supabase.from("events").select("*");
  if (type) query = query.eq("type", type);
  const { data } = await query.order("date", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("events").insert({
    name: body.name, description: body.description || null, date: body.date,
    type: body.type || "event", status: body.status || "upcoming",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
