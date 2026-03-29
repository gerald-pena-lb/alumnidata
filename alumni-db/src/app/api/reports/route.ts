import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "financial";
  const year = url.searchParams.get("year") || String(new Date().getFullYear());
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (type === "collection_rate") {
    const { count: activeCount } = await supabase.from("members").select("*", { count: "exact", head: true }).in("status", ["active", "immortal"]);
    const { data: paidMembers } = await supabase.from("annual_dues").select("member_id").eq("year", Number(year));
    const uniquePaid = new Set(paidMembers?.map((d) => d.member_id)).size;
    const { data: duesData } = await supabase.from("annual_dues").select("amount").eq("year", Number(year));
    const totalCollected = duesData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const active = activeCount || 0;
    const rate = active > 0 ? ((uniquePaid / active) * 100).toFixed(1) : "0";

    return NextResponse.json({
      active_members: active, paid_members: uniquePaid,
      collection_rate: rate, total_collected: totalCollected,
    });
  }

  // Financial report
  let duesQuery = supabase.from("annual_dues").select("amount, date_paid");
  let donationsQuery = supabase.from("donations").select("amount, date_given");
  let expendituresQuery = supabase.from("expenditures").select("amount, date");

  if (start && end) {
    duesQuery = duesQuery.gte("date_paid", start).lte("date_paid", end);
    donationsQuery = donationsQuery.gte("date_given", start).lte("date_given", end);
    expendituresQuery = expendituresQuery.gte("date", start).lte("date", end);
  } else {
    duesQuery = duesQuery.eq("year", Number(year));
    donationsQuery = donationsQuery.gte("date_given", `${year}-01-01`).lte("date_given", `${year}-12-31`);
    expendituresQuery = expendituresQuery.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  const [{ data: dues }, { data: donations }, { data: expenditures }] = await Promise.all([
    duesQuery, donationsQuery, expendituresQuery,
  ]);

  const duesTotal = dues?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const donationsTotal = donations?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const expendituresTotal = expenditures?.reduce((s, d) => s + Number(d.amount), 0) || 0;

  return NextResponse.json({
    dues_total: duesTotal, donations_total: donationsTotal,
    expenditures_total: expendituresTotal, net: duesTotal + donationsTotal - expendituresTotal,
  });
}
