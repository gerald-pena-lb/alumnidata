import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id, username, name, role FROM users WHERE id = ?").get(session.userId) as {
    id: number;
    username: string;
    name: string;
    role: string;
  } | undefined;
  db.close();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  return NextResponse.json(user);
}
