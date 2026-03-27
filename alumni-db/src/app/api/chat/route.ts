import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function getDbContext(): string {
  const db = getDb();
  try {
    const memberCount = db.prepare("SELECT COUNT(*) as count FROM members").get() as { count: number };
    const activeCount = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'alive'").get() as { count: number };
    const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
    const projectCount = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'project'").get() as { count: number };

    const currentYear = new Date().getFullYear();
    const duesTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE year = ?").get(currentYear) as { total: number };
    const donationsTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE strftime('%Y', date_given) = ?").get(String(currentYear)) as { total: number };
    const expendituresTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenditures WHERE strftime('%Y', date) = ?").get(String(currentYear)) as { total: number };

    const recentMembers = db.prepare("SELECT full_name, batch_name, year, current_company, title, industry FROM members ORDER BY created_at DESC LIMIT 10").all();
    const upcomingEvents = db.prepare("SELECT name, date, type, status FROM events WHERE status != 'completed' ORDER BY date ASC LIMIT 5").all();

    const batches = db.prepare("SELECT DISTINCT batch_name, COUNT(*) as count FROM members WHERE batch_name IS NOT NULL GROUP BY batch_name ORDER BY count DESC LIMIT 10").all();
    const industries = db.prepare("SELECT DISTINCT industry, COUNT(*) as count FROM members WHERE industry IS NOT NULL GROUP BY industry ORDER BY count DESC LIMIT 10").all();

    return `
DATABASE SUMMARY:
- Total members: ${memberCount.count}
- Active members: ${activeCount.count}
- Deceased: ${memberCount.count - activeCount.count}
- Events: ${eventCount.count}
- Projects: ${projectCount.count}

FINANCIALS (${currentYear}):
- Dues collected: ₱${duesTotal.total.toLocaleString()}
- Donations received: ₱${donationsTotal.total.toLocaleString()}
- Expenditures: ₱${expendituresTotal.total.toLocaleString()}
- Net: ₱${(duesTotal.total + donationsTotal.total - expendituresTotal.total).toLocaleString()}

TOP BATCHES:
${(batches as { batch_name: string; count: number }[]).map((b) => `- ${b.batch_name}: ${b.count} members`).join("\n")}

TOP INDUSTRIES:
${(industries as { industry: string; count: number }[]).map((i) => `- ${i.industry}: ${i.count} members`).join("\n")}

RECENT MEMBERS:
${(recentMembers as { full_name: string; batch_name: string; year: number; current_company: string; title: string; industry: string }[]).map((m) => `- ${m.full_name} (${m.batch_name || "N/A"}, ${m.year || "N/A"}) - ${m.title || ""} at ${m.current_company || "N/A"}`).join("\n")}

UPCOMING EVENTS/PROJECTS:
${(upcomingEvents as { name: string; date: string; type: string; status: string }[]).map((e) => `- ${e.name} (${e.type}, ${e.date}, ${e.status})`).join("\n") || "None"}
`.trim();
  } finally {
    db.close();
  }
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assistant is not configured. Set ANTHROPIC_API_KEY environment variable in Vercel." },
      { status: 503 }
    );
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const dbContext = getDbContext();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are an AI assistant for the UP Alpha Sigma Fraternity Alumni Database. You help users understand and query alumni data. Be concise and helpful. Use ₱ for Philippine Peso amounts.

Here is the current database state:
${dbContext}

Answer questions based on this data. If asked about something not in the data, say so. Keep responses brief and formatted nicely.`,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Anthropic API error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  const assistantMessage = data.content?.[0]?.text || "No response";

  return NextResponse.json({ response: assistantMessage });
}
