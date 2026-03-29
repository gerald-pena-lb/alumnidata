import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { data: member } = await supabase
    .from("members")
    .select("id, username, first_name, last_name, full_name, role, chapter, batch_name, batch_letter, year, phone_number, current_company, title, industry, status")
    .eq("id", session.userId)
    .single();

  if (!member) return NextResponse.json({ error: "User not found" }, { status: 401 });
  return NextResponse.json({ ...member, name: member.full_name, role: member.role || "brod" });
}
