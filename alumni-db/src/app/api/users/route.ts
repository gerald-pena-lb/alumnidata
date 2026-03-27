import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { data } = await supabase
    .from("members")
    .select("id, username, full_name, role, chapter, created_at")
    .not("username", "is", null)
    .order("created_at", { ascending: false });

  const mapped = (data || []).map((u) => ({ ...u, name: u.full_name }));
  return NextResponse.json(mapped);
}
