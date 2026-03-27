import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyPassword, hashPassword, verifySessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
  if (new_password.length < 6) return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });

  const { data: user } = await supabase.from("app_users").select("password_hash").eq("id", session.userId).single();
  if (!user || !verifyPassword(current_password, user.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  await supabase.from("app_users").update({ password_hash: hashPassword(new_password) }).eq("id", session.userId);
  return NextResponse.json({ success: true });
}
