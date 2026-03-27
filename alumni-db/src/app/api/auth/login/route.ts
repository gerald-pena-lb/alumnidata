import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as {
    id: number;
    username: string;
    password_hash: string;
    name: string;
    role: string;
  } | undefined;
  db.close();

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = createSessionToken(user.id, user.username, user.role);
  const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
