import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function ensureAdminUsers() {
  const { count } = await supabase.from("app_users").select("*", { count: "exact", head: true });
  if (count === 0 || count === null) {
    await supabase.from("app_users").insert([
      { username: "Gerald", password: "ubag1964", display_name: "Gerald", role: "admin" },
      { username: "admin", password: "admin123", display_name: "Administrator", role: "admin" },
    ]);
  }
}
