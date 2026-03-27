import { NextRequest, NextResponse } from "next/server";
import { supabase, ensureAdminUsers } from "@/lib/supabase";
import { createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 503 });
  }

  const seedResult = await ensureAdminUsers();
  if (seedResult?.error) {
    return NextResponse.json({ error: `DB seed error: ${seedResult.error}` }, { status: 500 });
  }

  const { data: user, error: queryError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (queryError) {
    return NextResponse.json({ error: `DB error: ${queryError.message}` }, { status: 500 });
  }

  // Support both plain text passwords and hashed passwords
  if (!user || user.password_hash !== password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const role = user.role === "admin" ? "admin" : user.role === "board_member" ? "board_member" : "viewer";
  const token = createSessionToken(user.id, user.username, role);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, name: user.name, role },
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
