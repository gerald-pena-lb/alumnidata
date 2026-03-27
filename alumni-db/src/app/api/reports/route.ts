import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "financial";
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const year = url.searchParams.get("year");

  if (type === "collection_rate") {
    const duesYear = year || new Date().getFullYear().toString();
    const totalMembers = db.prepare(
      "SELECT COUNT(*) as count FROM members WHERE status = 'alive'"
    ).get() as { count: number };
    const paidMembers = db.prepare(
      "SELECT COUNT(DISTINCT member_id) as count FROM annual_dues WHERE year = ?"
    ).get(Number(duesYear)) as { count: number };
    const totalCollected = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE year = ?"
    ).get(Number(duesYear)) as { total: number };

    db.close();
    return NextResponse.json({
      year: Number(duesYear),
      total_active_members: totalMembers.count,
      paid_members: paidMembers.count,
      collection_rate: totalMembers.count > 0
        ? ((paidMembers.count / totalMembers.count) * 100).toFixed(1)
        : "0.0",
      total_collected: totalCollected.total,
    });
  }

  // Financial report
  let duesQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE 1=1";
  let donationsQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE 1=1";
  let expendituresQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM expenditures WHERE 1=1";
  const duesParams: unknown[] = [];
  const donationsParams: unknown[] = [];
  const expendituresParams: unknown[] = [];

  if (startDate && endDate) {
    duesQuery += " AND date_paid BETWEEN ? AND ?";
    duesParams.push(startDate, endDate);
    donationsQuery += " AND date_given BETWEEN ? AND ?";
    donationsParams.push(startDate, endDate);
    expendituresQuery += " AND date BETWEEN ? AND ?";
    expendituresParams.push(startDate, endDate);
  }

  const duesTotal = db.prepare(duesQuery).get(...duesParams) as { total: number };
  const donationsTotal = db.prepare(donationsQuery).get(...donationsParams) as { total: number };
  const expendituresTotal = db.prepare(expendituresQuery).get(...expendituresParams) as { total: number };

  // Breakdown by month
  let duesBreakdown = `
    SELECT strftime('%Y-%m', date_paid) as month, SUM(amount) as total
    FROM annual_dues WHERE 1=1
  `;
  let donationsBreakdown = `
    SELECT strftime('%Y-%m', date_given) as month, SUM(amount) as total
    FROM donations WHERE 1=1
  `;
  let expBreakdown = `
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
    FROM expenditures WHERE 1=1
  `;

  if (startDate && endDate) {
    duesBreakdown += " AND date_paid BETWEEN ? AND ?";
    donationsBreakdown += " AND date_given BETWEEN ? AND ?";
    expBreakdown += " AND date BETWEEN ? AND ?";
  }

  duesBreakdown += " GROUP BY month ORDER BY month";
  donationsBreakdown += " GROUP BY month ORDER BY month";
  expBreakdown += " GROUP BY month ORDER BY month";

  const duesMonthly = startDate && endDate
    ? db.prepare(duesBreakdown).all(startDate, endDate)
    : db.prepare(duesBreakdown).all();
  const donationsMonthly = startDate && endDate
    ? db.prepare(donationsBreakdown).all(startDate, endDate)
    : db.prepare(donationsBreakdown).all();
  const expMonthly = startDate && endDate
    ? db.prepare(expBreakdown).all(startDate, endDate)
    : db.prepare(expBreakdown).all();

  db.close();

  return NextResponse.json({
    summary: {
      total_dues: duesTotal.total,
      total_donations: donationsTotal.total,
      total_income: duesTotal.total + donationsTotal.total,
      total_expenditures: expendituresTotal.total,
      net: duesTotal.total + donationsTotal.total - expendituresTotal.total,
    },
    breakdown: {
      dues: duesMonthly,
      donations: donationsMonthly,
      expenditures: expMonthly,
    },
    filters: { start: startDate, end: endDate },
  });
}
