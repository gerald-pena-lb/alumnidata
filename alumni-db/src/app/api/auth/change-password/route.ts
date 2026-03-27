import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { current_password, new_password, member_id } = await req.json();

  // Admin resetting another member's password
  if (member_id && session.role === "admin") {
    if (!new_password) return NextResponse.json({ error: "New password required" }, { status: 400 });
    await supabase.from("members").update({ password_hash: new_password }).eq("id", member_id);
    return NextResponse.json({ success: true });
  }

  // User changing own password
  if (!current_password || !new_password) return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
  if (new_password.length < 6) return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });

  const { data: member } = await supabase.from("members").select("password_hash").eq("id", session.userId).single();
  if (!member || member.password_hash !== current_password) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  await supabase.from("members").update({ password_hash: new_password }).eq("id", session.userId);
  return NextResponse.json({ success: true });
}
