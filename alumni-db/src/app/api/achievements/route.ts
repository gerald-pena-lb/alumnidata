import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  const isAdmin = session?.role === "admin" || session?.role === "board_member";

  let query = supabase.from("achievements").select("*, members(first_name, last_name, full_name, role)");
  if (!isAdmin) query = query.eq("approved", true);
  const { data } = await query.order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: member } = await supabase.from("members").select("status, role").eq("id", session.userId).single();
  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Only active members can post" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "Title and content required" }, { status: 400 });
  }

  const autoApprove = member.role === "admin" || member.role === "board_member";

  const { data, error } = await supabase.from("achievements").insert({
    author_id: session.userId,
    title: body.title.trim(),
    content: body.content.trim(),
    image_url: body.image_url || null,
    approved: autoApprove,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, approved: autoApprove }, { status: 201 });
}
