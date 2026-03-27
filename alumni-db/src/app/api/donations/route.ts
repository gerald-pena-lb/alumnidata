import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const memberId = new URL(req.url).searchParams.get("member_id");
  let query = supabase.from("donations").select("*, members(full_name)");
  if (memberId) query = query.eq("member_id", Number(memberId));
  const { data } = await query.order("date_given", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("donations").insert({
    member_id: body.member_id, amount: body.amount, date_given: body.date_given,
    remarks: body.remarks || null, transaction_reference: body.transaction_reference || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
