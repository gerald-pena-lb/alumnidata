import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function ensureAdminUsers(): Promise<{ error?: string } | null> {
  try {
    const { count, error: countError } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) return { error: `Count failed: ${countError.message}` };

    if (count === 0 || count === null) {
      const { error: insertError } = await supabase.from("members").insert({
        full_name: "Gerald Pena",
        username: "gerald",
        password_hash: "ubag1964",
        role: "admin",
        chapter: "Manila",
        status: "alive",
      });
      if (insertError) return { error: `Insert failed: ${insertError.message}` };
    }
    return null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function generateUsername(fullName: string): string {
  return fullName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, ".");
}
