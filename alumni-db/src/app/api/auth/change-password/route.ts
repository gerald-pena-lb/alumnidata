import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifyPassword, hashPassword, verifySessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) {
    return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(session.userId) as { password_hash: string } | undefined;

  if (!user || !verifyPassword(current_password, user.password_hash)) {
    db.close();
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = hashPassword(new_password);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, session.userId);
  db.close();

  return NextResponse.json({ success: true });
}
