import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function ensureAdminUsers(): Promise<{ error?: string } | null> {
  try {
    const { count, error: countError } = await supabase.from("app_users").select("*", { count: "exact", head: true });

    if (countError) {
      return { error: `Count failed: ${countError.message}` };
    }

    if (count === 0 || count === null) {
      const { error: insertError } = await supabase.from("app_users").insert([
        { username: "Gerald", password: "ubag1964", display_name: "Gerald", role: "admin" },
        { username: "admin", password: "admin123", display_name: "Administrator", role: "admin" },
      ]);

      if (insertError) {
        return { error: `Insert failed: ${insertError.message}` };
      }
    }

    return null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
