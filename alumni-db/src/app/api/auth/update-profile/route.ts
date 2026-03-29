import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.first_name !== undefined) updates.first_name = body.first_name;
  if (body.last_name !== undefined) updates.last_name = body.last_name;
  if (body.first_name !== undefined || body.last_name !== undefined) {
    updates.full_name = `${body.first_name ?? ""} ${body.last_name ?? ""}`.trim();
  }
  if (body.chapter !== undefined) updates.chapter = body.chapter || null;
  if (body.batch_name !== undefined) updates.batch_name = body.batch_name || null;
  if (body.batch_letter !== undefined) updates.batch_letter = body.batch_letter || null;
  if (body.year !== undefined) updates.year = body.year || null;
  if (body.phone_number !== undefined) updates.phone_number = body.phone_number || null;
  if (body.current_company !== undefined) updates.current_company = body.current_company || null;
  if (body.title !== undefined) updates.title = body.title || null;
  if (body.industry !== undefined) updates.industry = body.industry || null;
  // Status and role are admin-controlled only — intentionally ignored here
  // if (body.status !== undefined) updates.status = body.status;

  // Users cannot change their own role
  // body.role is intentionally ignored

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();
  await supabase.from("members").update(updates).eq("id", session.userId);
  return NextResponse.json({ success: true });
}
