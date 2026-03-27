import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");
  const year = url.searchParams.get("year");
  let query = supabase.from("annual_dues").select("*, members(full_name)");
  if (memberId) query = query.eq("member_id", Number(memberId));
  if (year) query = query.eq("year", Number(year));
  const { data } = await query.order("year", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("annual_dues").insert({
    member_id: body.member_id, year: body.year, amount: body.amount,
    date_paid: body.date_paid, remarks: body.remarks || null,
  }).select("id").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Dues already recorded for this year" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
