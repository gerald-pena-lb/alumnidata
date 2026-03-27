import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `Ikaw si Ubag, ang AI assistant ng UP Alpha Sigma Fraternity Alumni Association database system. Tumutulong ka sa mga brod na i-manage ang alumni data nila.

MAHALAGA:
- Laging mag-respond sa casual Filipino/Taglish. Parang kausap mo ang isang kapatid sa frat.
- LAGING tawagin ang user na "brod". Hal: "Ayos brod!", "Orayt brod!", "Solid brod!", "G na brod!"
- Gumamit ng mga expression tulad ng: "ayos", "solid!", "orayt brod!", "G!", "nice brod!", "eto na brod!", "panalo!", "sige brod"
- Kapag nag-execute ka ng action, mag-react ka ng enthusiastic: "Solid brod! Nagawa ko na!" o "Ayos! Tapos na brod!"
- Maging chill, witty, at kapatid ang dating mo. Hindi formal. Hindi robot.
- Kapag hindi mo kayang gawin ang request, sabihin: "Edni brod, di ko kaya yan" o "Dehins yan eto na lang ( ‿ * ‿ )" tapos mag-suggest ng alternative.

ACTIONS:
You can execute actions by outputting \`\`\`action JSON blocks. Supported actions:

1. create_project - Create project with sections and tasks
\`\`\`action
{"action":"create_project","name":"...","description":"...","date":"YYYY-MM-DD","sections":[{"name":"...","tasks":[{"name":"...","description":"..."}]}]}
\`\`\`

2. add_members - Bulk add members. Map chapter: manila→Manila, lb/los banos→Los Banos, diliman→Diliman
\`\`\`action
{"action":"add_members","members":[{"last_name":"...","first_name":"...","chapter":"Manila|Los Banos|Diliman","batch_name":"...","batch_letter":"...","year":2000,"phone_number":"...","current_company":"...","title":"...","industry":"...","status":"alive|deceased"}]}
\`\`\`

3. create_event - Create an event
\`\`\`action
{"action":"create_event","name":"...","description":"...","date":"YYYY-MM-DD","status":"upcoming|ongoing|completed"}
\`\`\`

4. upload_minutes - Parse raw meeting text into structured summary
\`\`\`action
{"action":"upload_minutes","raw_text":"...raw meeting text..."}
\`\`\`

5. query_finances - Fetch financial summary for a year
\`\`\`action
{"action":"query_finances","year":"2026"}
\`\`\`

6. generate_report - Generate report
\`\`\`action
{"action":"generate_report","type":"financial|collection_rate","year":"2026"}
\`\`\`

PARSING INSTRUCTIONS:
- For unstructured project text: parse into structured project with logical sections and tasks
- For member data: parse names and fields, map chapter variations, default status "alive", infer fields from context
- For meeting text: parse and upload via upload_minutes action
- For finance questions: use query_finances to fetch data and answer
- For report requests: use generate_report action
- Always explain what you'll do before outputting action blocks. State assumptions if data is unclear.
- Walang essay-essay, brod. Keep responses short.

CURRENT DATABASE STATE:
{DB_CONTEXT}`;

function getDbContext(): string {
  const db = getDb();
  try {
    const memberCount = db.prepare("SELECT COUNT(*) as count FROM members").get() as { count: number };
    const activeCount = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'alive'").get() as { count: number };
    const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
    const projectCount = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'project'").get() as { count: number };
    const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get() as { count: number };

    const currentYear = new Date().getFullYear();
    const duesTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE year = ?").get(currentYear) as { total: number };
    const donationsTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE strftime('%Y', date_given) = ?").get(String(currentYear)) as { total: number };
    const expendituresTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenditures WHERE strftime('%Y', date) = ?").get(String(currentYear)) as { total: number };

    const recentMembers = db.prepare("SELECT full_name, batch_name, year, current_company, title FROM members ORDER BY created_at DESC LIMIT 10").all();
    const activeProjects = db.prepare("SELECT name, status FROM events WHERE type = 'project' AND status != 'completed' ORDER BY date DESC LIMIT 5").all();

    return `
Members: ${memberCount.count} total, ${activeCount.count} active
Events: ${eventCount.count}, Projects: ${projectCount.count}, Tasks: ${taskCount.count}
Finances (${currentYear}): Dues ₱${duesTotal.total.toLocaleString()}, Donations ₱${donationsTotal.total.toLocaleString()}, Expenditures ₱${expendituresTotal.total.toLocaleString()}, Net ₱${(duesTotal.total + donationsTotal.total - expendituresTotal.total).toLocaleString()}
Recent members: ${(recentMembers as { full_name: string }[]).map((m) => m.full_name).join(", ") || "None"}
Active projects: ${(activeProjects as { name: string; status: string }[]).map((p) => `${p.name} (${p.status})`).join(", ") || "None"}
`.trim();
  } finally {
    db.close();
  }
}

interface ActionResult {
  label: string;
  success: boolean;
}

function executeActions(aiText: string): { cleanText: string; actions: ActionResult[] } {
  const actionRegex = /```action\s*\n?([\s\S]*?)\n?```/g;
  const actions: ActionResult[] = [];
  let cleanText = aiText;

  const matches = [...aiText.matchAll(actionRegex)];
  for (const match of matches) {
    cleanText = cleanText.replace(match[0], "").trim();
    try {
      const payload = JSON.parse(match[1].trim());
      const results = executeAction(payload);
      actions.push(...results);
    } catch (err) {
      actions.push({ label: `Dehins yan brod: ${err instanceof Error ? err.message : "parse error"}`, success: false });
    }
  }

  return { cleanText, actions };
}

function executeAction(payload: Record<string, unknown>): ActionResult[] {
  const db = getDb();
  const results: ActionResult[] = [];

  try {
    switch (payload.action) {
      case "create_project": {
        const p = payload as { name: string; description?: string; date: string; sections?: { name: string; tasks?: { name: string; description?: string }[] }[] };
        const res = db.prepare("INSERT INTO events (name, description, date, type, status) VALUES (?, ?, ?, 'project', 'upcoming')").run(
          p.name, p.description || null, p.date || new Date().toISOString().slice(0, 10)
        );
        const projectId = res.lastInsertRowid;
        results.push({ label: `Project "${p.name}" created`, success: true });

        if (p.sections) {
          for (const section of p.sections) {
            if (section.tasks) {
              for (const task of section.tasks) {
                db.prepare("INSERT INTO tasks (event_id, title, description, section, status) VALUES (?, ?, ?, ?, 'todo')").run(
                  projectId, task.name, task.description || null, section.name
                );
              }
              results.push({ label: `Section "${section.name}": ${section.tasks.length} task(s) added`, success: true });
            }
          }
        }
        break;
      }

      case "add_members": {
        const { members } = payload as { members: { last_name: string; first_name: string; chapter?: string; batch_name?: string; batch_letter?: string; year?: number; phone_number?: string; current_company?: string; title?: string; industry?: string; status?: string }[] };
        const insert = db.prepare("INSERT INTO members (full_name, batch_name, batch_letter, year, phone_number, current_company, title, industry, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

        const chapterMap: Record<string, string> = { manila: "Manila", lb: "Los Banos", "los banos": "Los Banos", diliman: "Diliman" };
        let count = 0;

        const insertAll = db.transaction(() => {
          for (const m of members) {
            const fullName = `${m.first_name} ${m.last_name}`.trim();
            const chapter = m.chapter ? (chapterMap[m.chapter.toLowerCase()] || m.chapter) : null;
            const batchName = m.batch_name || chapter;
            insert.run(
              fullName,
              batchName,
              m.batch_letter || null,
              m.year || null,
              m.phone_number || null,
              m.current_company || null,
              m.title || null,
              m.industry || null,
              m.status || "alive"
            );
            count++;
          }
        });
        insertAll();
        results.push({ label: `${count} member(s) added`, success: true });
        break;
      }

      case "create_event": {
        const e = payload as { name: string; description?: string; date: string; status?: string };
        db.prepare("INSERT INTO events (name, description, date, type, status) VALUES (?, ?, ?, 'event', ?)").run(
          e.name, e.description || null, e.date || new Date().toISOString().slice(0, 10), e.status || "upcoming"
        );
        results.push({ label: `Event "${e.name}" created`, success: true });
        break;
      }

      case "upload_minutes": {
        const { raw_text } = payload as { raw_text: string };
        db.prepare("INSERT INTO meeting_summaries (raw_text, date) VALUES (?, ?)").run(
          raw_text, new Date().toISOString().slice(0, 10)
        );
        results.push({ label: "Meeting minutes uploaded and saved", success: true });
        break;
      }

      case "query_finances": {
        const { year } = payload as { year: string };
        const y = Number(year);
        const dues = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE year = ?").get(y) as { total: number };
        const donations = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE strftime('%Y', date_given) = ?").get(String(y)) as { total: number };
        const expenditures = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenditures WHERE strftime('%Y', date) = ?").get(String(y)) as { total: number };
        const net = dues.total + donations.total - expenditures.total;
        results.push({
          label: `${year} Finances: Dues ₱${dues.total.toLocaleString()}, Donations ₱${donations.total.toLocaleString()}, Expenditures ₱${expenditures.total.toLocaleString()}, Net ₱${net.toLocaleString()}`,
          success: true,
        });
        break;
      }

      case "generate_report": {
        const { type, year } = payload as { type: string; year: string };
        const y = Number(year);
        if (type === "collection_rate") {
          const active = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'alive'").get() as { count: number };
          const paid = db.prepare("SELECT COUNT(DISTINCT member_id) as count FROM annual_dues WHERE year = ?").get(y) as { count: number };
          const total = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE year = ?").get(y) as { total: number };
          const rate = active.count > 0 ? ((paid.count / active.count) * 100).toFixed(1) : "0";
          results.push({
            label: `${year} Collection: ${paid.count}/${active.count} members (${rate}%), Total ₱${total.total.toLocaleString()}`,
            success: true,
          });
        } else {
          const dues = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM annual_dues WHERE year = ?").get(y) as { total: number };
          const donations = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE strftime('%Y', date_given) = ?").get(String(y)) as { total: number };
          const expenditures = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenditures WHERE strftime('%Y', date) = ?").get(String(y)) as { total: number };
          results.push({
            label: `${year} Financial Report: Income ₱${(dues.total + donations.total).toLocaleString()}, Expenses ₱${expenditures.total.toLocaleString()}, Net ₱${(dues.total + donations.total - expenditures.total).toLocaleString()}`,
            success: true,
          });
        }
        break;
      }

      default:
        results.push({ label: `Dehins yan brod: unknown action "${payload.action}"`, success: false });
    }
  } catch (err) {
    results.push({ label: `Dehins yan brod: ${err instanceof Error ? err.message : "execution error"}`, success: false });
  } finally {
    db.close();
  }

  return results;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Dehins yan brod, wala pang ANTHROPIC_API_KEY. Set mo muna sa Vercel env vars!" },
      { status: 503 }
    );
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const dbContext = getDbContext();
  const systemPrompt = SYSTEM_PROMPT.replace("{DB_CONTEXT}", dbContext);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Anthropic API error:", err);
    return NextResponse.json({ error: "Dehins yan brod, parang walang connection. Try mo ulit!" }, { status: 502 });
  }

  const data = await response.json();
  const aiText = data.content?.[0]?.text || "Dehins yan brod, walang response.";

  const { cleanText, actions } = executeActions(aiText);

  return NextResponse.json({
    response: cleanText || "Ayos brod! Check mo na lang yung results.",
    actions: actions.length > 0 ? actions : undefined,
  });
}
