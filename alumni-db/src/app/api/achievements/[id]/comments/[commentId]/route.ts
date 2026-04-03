import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || (session.role !== "admin" && session.role !== "board_member")) {
    return NextResponse.json({ error: "Board member or admin access required" }, { status: 403 });
  }
  const { commentId } = await params;
  await supabase.from("achievement_comments").delete().eq("id", Number(commentId));
  return NextResponse.json({ success: true });
}
