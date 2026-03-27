import { NextRequest, NextResponse } from "next/server";
import { supabase, ensureAdminUsers } from "@/lib/supabase";
import { verifyPassword, createSessionToken } from "@/lib/auth";

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

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = createSessionToken(user.id, user.username, user.role);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
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
