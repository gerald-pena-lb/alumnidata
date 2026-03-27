import { NextRequest, NextResponse } from "next/server";
import { supabase, ensureAdminUsers } from "@/lib/supabase";
import { createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  await ensureAdminUsers();

  const { data: user } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username)
    .single();

  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const role = user.role === "admin" ? "admin" : user.role === "board_member" ? "board_member" : "viewer";
  const token = createSessionToken(user.id, user.username, role);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, name: user.display_name, role },
  });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
