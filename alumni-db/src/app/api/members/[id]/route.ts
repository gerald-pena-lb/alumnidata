import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(Number(id));
  if (!member) {
    db.close();
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dues = db.prepare("SELECT * FROM annual_dues WHERE member_id = ? ORDER BY year DESC").all(Number(id));
  const donations = db.prepare("SELECT * FROM donations WHERE member_id = ? ORDER BY date_given DESC").all(Number(id));
  db.close();
  return NextResponse.json({ ...member as object, dues, donations });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  db.prepare(`
    UPDATE members SET
      full_name = ?, chapter = ?, batch_name = ?, batch_letter = ?, year = ?,
      phone_number = ?, current_company = ?, title = ?, industry = ?,
      status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    body.full_name,
    body.chapter || null,
    body.batch_name || null,
    body.batch_letter || null,
    body.year || null,
    body.phone_number || null,
    body.current_company || null,
    body.title || null,
    body.industry || null,
    body.status || "alive",
    Number(id)
  );

  db.close();
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required to delete members" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM members WHERE id = ?").run(Number(id));
  db.close();
  return NextResponse.json({ success: true });
}
