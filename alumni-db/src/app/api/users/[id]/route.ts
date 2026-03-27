import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const { role } = await req.json();
  await supabase.from("users").update({ role }).eq("id", Number(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  if (Number(id) === session.userId) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  await supabase.from("users").delete().eq("id", Number(id));
  return NextResponse.json({ success: true });
}
