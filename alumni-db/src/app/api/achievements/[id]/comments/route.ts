import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase
    .from("achievement_comments")
    .select("*, members(first_name, last_name, full_name)")
    .eq("achievement_id", Number(id))
    .order("created_at");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: member } = await supabase.from("members").select("status").eq("id", session.userId).single();
  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "Only active members can comment" }, { status: 403 });
  }

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Comment required" }, { status: 400 });

  const { data, error } = await supabase.from("achievement_comments").insert({
    achievement_id: Number(id),
    author_id: session.userId,
    content: content.trim(),
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
