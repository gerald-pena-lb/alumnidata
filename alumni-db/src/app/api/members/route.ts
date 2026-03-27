import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const industry = url.searchParams.get("industry") || "";
  const batch = url.searchParams.get("batch") || "";
  const year = url.searchParams.get("year") || "";
  const titleFilter = url.searchParams.get("title") || "";
  const status = url.searchParams.get("status") || "";
  const chapter = url.searchParams.get("chapter") || "";

  let query = "SELECT * FROM members WHERE 1=1";
  const params: unknown[] = [];

  if (search) {
    query += " AND full_name LIKE ?";
    params.push(`%${search}%`);
  }
  if (industry) {
    query += " AND industry = ?";
    params.push(industry);
  }
  if (batch) {
    query += " AND (batch_name LIKE ? OR batch_letter LIKE ?)";
    params.push(`%${batch}%`, `%${batch}%`);
  }
  if (year) {
    query += " AND year = ?";
    params.push(Number(year));
  }
  if (titleFilter) {
    query += " AND title LIKE ?";
    params.push(`%${titleFilter}%`);
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (chapter) {
    query += " AND chapter = ?";
    params.push(chapter);
  }

  query += " ORDER BY full_name ASC";
  const members = db.prepare(query).all(...params);
  db.close();
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  // Support batch insert
  if (Array.isArray(body)) {
    const stmt = db.prepare(`
      INSERT INTO members (full_name, chapter, batch_name, batch_letter, year, phone_number, current_company, title, industry, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((members: typeof body) => {
      for (const m of members) {
        stmt.run(
          m.full_name,
          m.chapter || null,
          m.batch_name || null,
          m.batch_letter || null,
          m.year || null,
          m.phone_number || null,
          m.current_company || null,
          m.title || null,
          m.industry || null,
          m.status || "alive"
        );
      }
    });
    insertMany(body);
    db.close();
    return NextResponse.json({ success: true, count: body.length }, { status: 201 });
  }

  const result = db.prepare(`
    INSERT INTO members (full_name, chapter, batch_name, batch_letter, year, phone_number, current_company, title, industry, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    body.status || "alive"
  );

  db.close();
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
