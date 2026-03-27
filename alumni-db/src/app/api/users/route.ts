import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifySessionToken, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const db = getDb();
  const users = db.prepare("SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC").all();
  db.close();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { username, password, name, role } = await req.json();
  if (!username || !password || !name) {
    return NextResponse.json({ error: "Username, password, and name required" }, { status: 400 });
  }

  const validRoles = ["admin", "board_member", "viewer"];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    db.close();
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const passwordHash = hashPassword(password);
  const result = db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)").run(
    username, passwordHash, name, role || "viewer"
  );
  db.close();

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
