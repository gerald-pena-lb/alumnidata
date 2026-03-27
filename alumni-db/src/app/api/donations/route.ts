import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");

  let query = `
    SELECT d.*, m.full_name
    FROM donations d
    JOIN members m ON d.member_id = m.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (memberId) {
    query += " AND d.member_id = ?";
    params.push(Number(memberId));
  }
  query += " ORDER BY d.date_given DESC";

  const donations = db.prepare(query).all(...params);
  db.close();
  return NextResponse.json(donations);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO donations (member_id, amount, date_given, remarks, transaction_reference)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    body.member_id,
    body.amount,
    body.date_given,
    body.remarks || null,
    body.transaction_reference || null
  );

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
