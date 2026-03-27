import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from("goals").insert({
    event_id: Number(id), minute_id: body.minute_id || null, description: body.description, status: body.status || "pending",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  await supabase.from("goals").update({ status: body.status }).eq("id", body.goal_id);
  return NextResponse.json({ success: true });
}
