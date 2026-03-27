import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), session.userId);
  db.close();

  return NextResponse.json({ success: true });
}
