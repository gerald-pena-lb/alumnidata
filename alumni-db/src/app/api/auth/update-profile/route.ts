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

  if (body.full_name) updates.full_name = body.full_name;
  if (body.name) updates.full_name = body.name;
  if (body.phone_number !== undefined) updates.phone_number = body.phone_number || null;
  if (body.current_company !== undefined) updates.current_company = body.current_company || null;
  if (body.title !== undefined) updates.title = body.title || null;
  if (body.industry !== undefined) updates.industry = body.industry || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();
  await supabase.from("members").update(updates).eq("id", session.userId);
  return NextResponse.json({ success: true });
}
