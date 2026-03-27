import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import Papa from "papaparse";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: "CSV parse errors", details: parsed.errors },
      { status: 400 }
    );
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO members (full_name, batch_name, batch_letter, year, phone_number, current_company, title, industry, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  const errors: string[] = [];

  const insertMany = db.transaction((rows: Record<string, string>[]) => {
    for (const row of rows) {
      if (!row.full_name) {
        errors.push(`Row skipped: missing full_name`);
        continue;
      }
      stmt.run(
        row.full_name,
        row.batch_name || null,
        row.batch_letter || null,
        row.year ? Number(row.year) : null,
        row.phone_number || null,
        row.current_company || null,
        row.title || null,
        row.industry || null,
        row.status || "alive"
      );
      count++;
    }
  });

  insertMany(parsed.data as Record<string, string>[]);
  db.close();

  return NextResponse.json({ success: true, imported: count, errors }, { status: 201 });
}
