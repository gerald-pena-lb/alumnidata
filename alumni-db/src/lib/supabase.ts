import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function ensureAdminUsers() {
  const { count } = await supabase.from("app_users").select("*", { count: "exact", head: true });
  if (count === 0 || count === null) {
    const users = [
      { username: "admin", password: "admin123", name: "Administrator" },
      { username: "gerald_pena", password: "ubag2004", name: "Gerald Pena" },
    ];
    for (const u of users) {
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(u.password, salt, 64).toString("hex");
      await supabase.from("app_users").insert({
        username: u.username,
        password_hash: `${salt}:${hash}`,
        name: u.name,
        role: "admin",
      });
    }
  }
}
