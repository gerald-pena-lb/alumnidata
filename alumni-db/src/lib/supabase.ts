import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function ensureAdminUsers(): Promise<{ error?: string } | null> {
  try {
    const sb = getSupabase();
    const { count, error: countError } = await sb
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) return { error: `Count failed: ${countError.message}` };

    if (count === 0 || count === null) {
      const { error: insertError } = await sb.from("members").insert({
        first_name: "Gerald",
        last_name: "Pena",
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
