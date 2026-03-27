import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("id, username, name, role")
    .eq("id", session.userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const role = user.role === "admin" ? "admin" : user.role === "board_member" ? "board_member" : "viewer";
  return NextResponse.json({ id: user.id, username: user.username, name: user.name, role });
}
