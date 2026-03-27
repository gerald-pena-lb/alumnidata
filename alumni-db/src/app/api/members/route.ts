import { NextRequest, NextResponse } from "next/server";
import { supabase, generateUsername } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let query = supabase.from("members").select("*");

  const search = url.searchParams.get("search");
  const industry = url.searchParams.get("industry");
  const batch = url.searchParams.get("batch");
  const year = url.searchParams.get("year");
  const titleFilter = url.searchParams.get("title");
  const status = url.searchParams.get("status");
  const chapter = url.searchParams.get("chapter");

  if (search) query = query.ilike("full_name", `%${search}%`);
  if (industry) query = query.eq("industry", industry);
  if (batch) query = query.or(`batch_name.ilike.%${batch}%,batch_letter.ilike.%${batch}%`);
  if (year) query = query.eq("year", Number(year));
  if (titleFilter) query = query.ilike("title", `%${titleFilter}%`);
  if (status) query = query.eq("status", status);
  if (chapter) query = query.eq("chapter", chapter);

  const { data } = await query.order("full_name");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (Array.isArray(body)) {
    const rows = body.map((m: Record<string, unknown>) => ({
      full_name: m.full_name,
      chapter: m.chapter || null,
      batch_name: m.batch_name || null,
      batch_letter: m.batch_letter || null,
      year: m.year || null,
      phone_number: m.phone_number || null,
      current_company: m.current_company || null,
      title: m.title || null,
      industry: m.industry || null,
      status: m.status || "alive",
      username: m.username || generateUsername(m.full_name as string),
      password_hash: "masig123",
      role: "brod",
    }));
    const { error } = await supabase.from("members").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, count: rows.length }, { status: 201 });
  }

  const username = body.username || generateUsername(body.full_name);
  const { data, error } = await supabase.from("members").insert({
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
    username,
    password_hash: "masig123",
    role: body.role || "brod",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
