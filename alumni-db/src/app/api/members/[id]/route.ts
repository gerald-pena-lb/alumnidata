import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: member } = await supabase.from("members").select("*").eq("id", Number(id)).single();
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: dues } = await supabase.from("annual_dues").select("*").eq("member_id", Number(id)).order("year", { ascending: false });
  const { data: donations } = await supabase.from("donations").select("*").eq("member_id", Number(id)).order("date_given", { ascending: false });

  return NextResponse.json({ ...member, dues: dues || [], donations: donations || [] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  await supabase.from("members").update({
    full_name: body.full_name,
    chapter: body.chapter || null,
    batch_name: body.batch_name || null,
    batch_letter: body.batch_letter || null,
    year: body.year || null,
    phone_number: body.phone_number || null,
    current_company: body.current_company || null,
    title: body.title || null,
    industry: body.industry || null,
    status: body.status || "alive",
    updated_at: new Date().toISOString(),
  }).eq("id", Number(id));

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required to delete members" }, { status: 403 });
  }

  const { id } = await params;
  await supabase.from("members").delete().eq("id", Number(id));
  return NextResponse.json({ success: true });
}
