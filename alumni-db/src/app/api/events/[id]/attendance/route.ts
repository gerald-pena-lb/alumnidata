import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase
    .from("event_attendance")
    .select("member_id, created_at, members(id, first_name, last_name, full_name, chapter)")
    .eq("event_id", Number(id));
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member_id } = await req.json();

  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.role === "admin" || session.role === "board_member";
  const targetId = isAdmin && member_id ? member_id : session.userId;

  const { error } = await supabase
    .from("event_attendance")
    .insert({ event_id: Number(id), member_id: targetId });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already marked as present" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member_id } = await req.json();

  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.role === "admin" || session.role === "board_member";
  const targetId = isAdmin && member_id ? member_id : session.userId;

  if (!isAdmin && targetId !== session.userId) {
    return NextResponse.json({ error: "Cannot remove others" }, { status: 403 });
  }

  await supabase
    .from("event_attendance")
    .delete()
    .eq("event_id", Number(id))
    .eq("member_id", targetId);

  return NextResponse.json({ success: true });
}
