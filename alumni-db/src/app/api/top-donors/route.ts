import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const y = new Date().getFullYear();

  // This year's donations grouped by member
  const { data: yearDonations } = await supabase
    .from("donations")
    .select("member_id, amount, members(first_name, last_name, full_name, chapter)")
    .gte("date_given", `${y}-01-01`)
    .lte("date_given", `${y}-12-31`);

  // All time donations
  const { data: allDonations } = await supabase
    .from("donations")
    .select("member_id, amount, members(first_name, last_name, full_name, chapter)");

  function aggregate(donations: typeof yearDonations) {
    const totals: Record<number, { member_id: number; total: number; name: string; chapter: string }> = {};
    for (const d of donations || []) {
      if (!totals[d.member_id]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = d.members as any;
        totals[d.member_id] = { member_id: d.member_id, total: 0, name: m?.full_name || "Unknown", chapter: m?.chapter || "" };
      }
      totals[d.member_id].total += Number(d.amount);
    }
    return Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 5);
  }

  return NextResponse.json({
    year: y,
    top_this_year: aggregate(yearDonations),
    top_all_time: aggregate(allDonations),
  });
}
