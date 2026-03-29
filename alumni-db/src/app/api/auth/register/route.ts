import { NextRequest, NextResponse } from "next/server";
import { supabase, generateUsername } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { first_name, last_name, username, password } = body;

  if (!first_name?.trim() || !last_name?.trim()) {
    return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const finalUsername = username?.trim() || generateUsername(`${first_name} ${last_name}`);

  // Check if username already exists
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("username", finalUsername)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Username already taken. Please choose a different one." }, { status: 409 });
  }

  const fullName = `${first_name.trim()} ${last_name.trim()}`;

  const { data, error } = await supabase.from("members").insert({
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    full_name: fullName,
    username: finalUsername,
    password_hash: password,
    role: "brod",
    status: "inactive",
    chapter: body.chapter || null,
    batch_name: body.batch_name || null,
    batch_letter: body.batch_letter || null,
    year: body.year ? Number(body.year) : null,
    phone_number: body.phone_number || null,
    current_company: body.current_company || null,
    title: body.title || null,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, username: finalUsername }, { status: 201 });
}
