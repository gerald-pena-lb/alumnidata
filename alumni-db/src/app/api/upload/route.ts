import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import Papa from "papaparse";

// Map various CSV header names to our DB columns
function normalizeHeaders(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const k = key.trim().toLowerCase().replace(/[\s_-]+/g, "_");
    normalized[k] = value?.trim() || "";
  }
  return normalized;
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k]) return row[k];
  }
  return "";
}

function getName(row: Record<string, string>): string {
  // Try full_name first
  const full = getField(row, "full_name", "fullname", "name", "member_name", "member");
  if (full) return full;
  // Try first + last
  const first = getField(row, "first_name", "firstname", "first");
  const last = getField(row, "last_name", "lastname", "last", "surname");
  if (first || last) return `${first} ${last}`.trim();
  return "";
}

export async function POST(req: NextRequest) {
  let db;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.data.length === 0) {
      return NextResponse.json({ error: "CSV is empty or has no valid rows" }, { status: 400 });
    }

    db = getDb();
    const stmt = db.prepare(`
      INSERT INTO members (full_name, chapter, batch_name, batch_letter, year, phone_number, current_company, title, industry, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    const errors: string[] = [];

    const insertMany = db.transaction((rows: Record<string, string>[]) => {
      for (let i = 0; i < rows.length; i++) {
        const row = normalizeHeaders(rows[i]);
        const fullName = getName(row);

        if (!fullName) {
          errors.push(`Row ${i + 1} skipped: no name found`);
          continue;
        }

        const yearVal = getField(row, "year", "batch_year", "grad_year");
        const yearNum = yearVal ? Number(yearVal) : null;
        const chapterVal = getField(row, "chapter");
        const chapterMap: Record<string, string> = { diliman: "Diliman", "los_banos": "Los Banos", "los banos": "Los Banos", lb: "Los Banos", manila: "Manila" };
        const chapter = chapterVal ? (chapterMap[chapterVal.toLowerCase()] || chapterVal) : null;
        const statusVal = getField(row, "status").toLowerCase();
        const status = statusVal === "deceased" ? "deceased" : "alive";

        try {
          stmt.run(
            fullName,
            chapter,
            getField(row, "batch_name", "batchname", "batch") || null,
            getField(row, "batch_letter", "batchletter", "letter") || null,
            yearNum && !isNaN(yearNum) ? yearNum : null,
            getField(row, "phone_number", "phonenumber", "phone", "contact", "mobile", "cell") || null,
            getField(row, "current_company", "currentcompany", "company", "employer", "organization") || null,
            getField(row, "title", "job_title", "jobtitle", "position", "role") || null,
            getField(row, "industry", "sector", "field") || null,
            status
          );
          count++;
        } catch (err) {
          errors.push(`Row ${i + 1} (${fullName}): ${err instanceof Error ? err.message : "insert error"}`);
        }
      }
    });

    insertMany(parsed.data as Record<string, string>[]);
    db.close();

    if (count === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: `No rows imported. Issues: ${errors.slice(0, 5).join("; ")}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, imported: count, errors: errors.length > 0 ? errors : undefined },
      { status: 201 }
    );
  } catch (err) {
    if (db) try { db.close(); } catch { /* ignore */ }
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
