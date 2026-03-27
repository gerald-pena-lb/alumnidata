import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");
  const year = url.searchParams.get("year");

  let query = `
    SELECT d.*, m.full_name
    FROM annual_dues d
    JOIN members m ON d.member_id = m.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (memberId) {
    query += " AND d.member_id = ?";
    params.push(Number(memberId));
  }
  if (year) {
    query += " AND d.year = ?";
    params.push(Number(year));
  }
  query += " ORDER BY d.year DESC, m.full_name ASC";

  const dues = db.prepare(query).all(...params);
  db.close();
  return NextResponse.json(dues);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  try {
    const result = db.prepare(`
      INSERT INTO annual_dues (member_id, year, amount, date_paid, remarks)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      body.member_id,
      body.year,
      body.amount,
      body.date_paid,
      body.remarks || null
    );
    db.close();
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e: unknown) {
    db.close();
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Dues already recorded for this member and year" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
