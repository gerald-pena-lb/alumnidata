import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateUsername } from "@/lib/supabase";
import Papa from "papaparse";

function normalizeHeaders(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase().replace(/[\s_-]+/g, "_")] = value?.trim() || "";
  }
  return normalized;
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) { if (row[k]) return row[k]; }
  return "";
}

function getNames(row: Record<string, string>): { first_name: string; last_name: string; full_name: string } {
  let first = getField(row, "first_name", "firstname", "first");
  let last = getField(row, "last_name", "lastname", "last", "surname");
  if (!first && !last) {
    const full = getField(row, "full_name", "fullname", "name", "member_name", "member");
    if (full) {
      const parts = full.split(" ");
      first = parts[0] || "";
      last = parts.slice(1).join(" ");
    }
  }
  return { first_name: first, last_name: last, full_name: `${first} ${last}`.trim() };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.data.length === 0) return NextResponse.json({ error: "CSV is empty" }, { status: 400 });

    const chapterMap: Record<string, string> = { diliman: "Diliman", los_banos: "Los Banos", "los banos": "Los Banos", lb: "Los Banos", manila: "Manila" };
    let count = 0;
    const errors: string[] = [];
    const rows = parsed.data as Record<string, string>[];

    for (let i = 0; i < rows.length; i++) {
      const row = normalizeHeaders(rows[i]);
      const { first_name, last_name, full_name: fullName } = getNames(row);
      if (!fullName) { errors.push(`Row ${i + 1}: no name`); continue; }

      const chapterVal = getField(row, "chapter");
      const chapter = chapterVal ? (chapterMap[chapterVal.toLowerCase()] || chapterVal) : null;
      const yearVal = getField(row, "year", "batch_year", "grad_year");
      const yearNum = yearVal ? Number(yearVal) : null;
      const statusVal = getField(row, "status").toLowerCase();

      const { error } = await supabase.from("members").insert({
        first_name,
        last_name,
        full_name: fullName,
        chapter,
        batch_name: getField(row, "batch_name", "batchname", "batch") || null,
        batch_letter: getField(row, "batch_letter", "batchletter", "letter") || null,
        year: yearNum && !isNaN(yearNum) ? yearNum : null,
        phone_number: getField(row, "phone_number", "phonenumber", "phone", "contact", "mobile") || null,
        current_company: getField(row, "current_company", "currentcompany", "company", "employer") || null,
        title: getField(row, "title", "job_title", "jobtitle", "position") || null,
        industry: getField(row, "industry", "sector", "field") || null,
        status: statusVal === "deceased" ? "deceased" : "alive",
        username: getField(row, "username") || generateUsername(fullName),
        password_hash: "masig123",
        role: "brod",
      });

      if (error) errors.push(`Row ${i + 1} (${fullName}): ${error.message}`);
      else count++;
    }

    if (count === 0 && errors.length > 0) {
      return NextResponse.json({ error: `No rows imported. ${errors.slice(0, 3).join("; ")}` }, { status: 400 });
    }
    return NextResponse.json({ success: true, imported: count, errors: errors.length > 0 ? errors : undefined }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
