import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { data } = await supabase.from("app_users").select("id, username, display_name, role, created_at").order("created_at", { ascending: false });
  const mapped = (data || []).map((u) => ({ ...u, name: u.display_name }));
  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { username, password, name, role } = await req.json();
  if (!username || !password || !name) return NextResponse.json({ error: "Username, password, and name required" }, { status: 400 });

  const { data: existing } = await supabase.from("app_users").select("id").eq("username", username).single();
  if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

  const { data, error } = await supabase.from("app_users").insert({
    username, password, display_name: name, role: role || "user",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
