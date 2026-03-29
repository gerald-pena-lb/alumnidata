import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.role) {
    const validRoles = ["admin", "board_member", "brod"];
    if (!validRoles.includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    updates.role = body.role;
  }
  if (body.status !== undefined) {
    const validStatuses = ["active", "inactive", "immortal"];
    if (!validStatuses.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    updates.status = body.status;
  }
  if (body.active_start_date !== undefined) updates.active_start_date = body.active_start_date || null;
  if (body.active_end_date !== undefined) updates.active_end_date = body.active_end_date || null;

  updates.updated_at = new Date().toISOString();
  await supabase.from("members").update(updates).eq("id", Number(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  if (Number(id) === session.userId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await supabase.from("members").delete().eq("id", Number(id));
  return NextResponse.json({ success: true });
}
