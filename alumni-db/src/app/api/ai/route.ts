import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

1. create_project - {"action":"create_project","name":"...","description":"...","date":"YYYY-MM-DD","sections":[{"name":"...","tasks":[{"name":"...","description":"..."}]}]}
2. add_members - {"action":"add_members","members":[{"last_name":"...","first_name":"...","chapter":"Manila|Los Banos|Diliman","batch_name":"...","year":2000,"status":"alive|deceased"}]}
3. create_event - {"action":"create_event","name":"...","description":"...","date":"YYYY-MM-DD","status":"upcoming|ongoing|completed"}
4. upload_minutes - {"action":"upload_minutes","raw_text":"..."}
5. query_finances - {"action":"query_finances","year":"2026"}
6. generate_report - {"action":"generate_report","type":"financial|collection_rate","year":"2026"}

PARSING INSTRUCTIONS:
- For unstructured project text: parse into structured project with logical sections and tasks
- For member data: parse names and fields, map chapter variations, default status "alive"
- Walang essay-essay, brod. Keep responses short.

CURRENT DATABASE STATE:
{DB_CONTEXT}`;

async function getDbContext(): Promise<string> {
  const { count: memberCount } = await supabase.from("members").select("*", { count: "exact", head: true });
  const { count: activeCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "alive");
  const { count: eventCount } = await supabase.from("events").select("*", { count: "exact", head: true });
  const { count: projectCount } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("type", "project");
  const { count: taskCount } = await supabase.from("tasks").select("*", { count: "exact", head: true });

  const y = new Date().getFullYear();
  const { data: dues } = await supabase.from("annual_dues").select("amount").eq("year", y);
  const duesTotal = dues?.reduce((s, d) => s + Number(d.amount), 0) || 0;

  return `Members: ${memberCount || 0} total, ${activeCount || 0} active\nEvents: ${eventCount || 0}, Projects: ${projectCount || 0}, Tasks: ${taskCount || 0}\nDues (${y}): ₱${duesTotal.toLocaleString()}`;
}

interface ActionResult { label: string; success: boolean; }

async function executeActions(aiText: string): Promise<{ cleanText: string; actions: ActionResult[] }> {
  const actionRegex = /```action\s*\n?([\s\S]*?)\n?```/g;
  const actions: ActionResult[] = [];
  let cleanText = aiText;
  const matches = [...aiText.matchAll(actionRegex)];

  for (const match of matches) {
    cleanText = cleanText.replace(match[0], "").trim();
    try {
      const payload = JSON.parse(match[1].trim());
      const results = await executeAction(payload);
      actions.push(...results);
    } catch (err) {
      actions.push({ label: `Dehins yan brod: ${err instanceof Error ? err.message : "parse error"}`, success: false });
    }
  }
  return { cleanText, actions };
}

async function executeAction(payload: Record<string, unknown>): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  try {
    switch (payload.action) {
      case "create_project": {
        const p = payload as { name: string; description?: string; date: string; sections?: { name: string; tasks?: { name: string; description?: string }[] }[] };
        const { data } = await supabase.from("events").insert({
          name: p.name, description: p.description || null, date: p.date || new Date().toISOString().slice(0, 10), type: "project", status: "upcoming",
        }).select("id").single();
        results.push({ label: `Project "${p.name}" created`, success: true });
        if (data && p.sections) {
          for (const section of p.sections) {
            if (section.tasks) {
              for (const task of section.tasks) {
                await supabase.from("tasks").insert({ event_id: data.id, title: task.name, description: task.description || null, section: section.name, status: "todo" });
              }
              results.push({ label: `Section "${section.name}": ${section.tasks.length} task(s)`, success: true });
            }
          }
        }
        break;
      }
      case "add_members": {
        const { members } = payload as { members: { last_name: string; first_name: string; chapter?: string; batch_name?: string; year?: number; status?: string }[] };
        const chapterMap: Record<string, string> = { manila: "Manila", lb: "Los Banos", "los banos": "Los Banos", diliman: "Diliman" };
        let count = 0;
        for (const m of members) {
          const fullName = `${m.first_name} ${m.last_name}`.trim();
          const chapter = m.chapter ? (chapterMap[m.chapter.toLowerCase()] || m.chapter) : null;
          const { error } = await supabase.from("members").insert({
            full_name: fullName, chapter, batch_name: m.batch_name || chapter, year: m.year || null, status: m.status || "alive",
          });
          if (!error) count++;
        }
        results.push({ label: `${count} member(s) added`, success: true });
        break;
      }
      case "create_event": {
        const e = payload as { name: string; description?: string; date: string; status?: string };
        await supabase.from("events").insert({ name: e.name, description: e.description || null, date: e.date || new Date().toISOString().slice(0, 10), type: "event", status: e.status || "upcoming" });
        results.push({ label: `Event "${e.name}" created`, success: true });
        break;
      }
      case "upload_minutes": {
        const { raw_text } = payload as { raw_text: string };
        await supabase.from("meeting_summaries").insert({ raw_text, meeting_date: new Date().toISOString().slice(0, 10) });
        results.push({ label: "Meeting minutes uploaded", success: true });
        break;
      }
      case "query_finances": {
        const y = Number((payload as { year: string }).year);
        const { data: d } = await supabase.from("annual_dues").select("amount").eq("year", y);
        const { data: don } = await supabase.from("donations").select("amount").gte("date_given", `${y}-01-01`).lte("date_given", `${y}-12-31`);
        const { data: exp } = await supabase.from("expenditures").select("amount").gte("date", `${y}-01-01`).lte("date", `${y}-12-31`);
        const dt = d?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const dnt = don?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const et = exp?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        results.push({ label: `${y}: Dues ₱${dt.toLocaleString()}, Donations ₱${dnt.toLocaleString()}, Expenses ₱${et.toLocaleString()}, Net ₱${(dt + dnt - et).toLocaleString()}`, success: true });
        break;
      }
      case "generate_report": {
        const { type, year } = payload as { type: string; year: string };
        results.push({ label: `${year} ${type} report generated - check Reports page`, success: true });
        break;
      }
      default:
        results.push({ label: `Unknown action "${payload.action}"`, success: false });
    }
  } catch (err) {
    results.push({ label: `Dehins yan brod: ${err instanceof Error ? err.message : "error"}`, success: false });
  }
  return results;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Dehins yan brod, wala pang ANTHROPIC_API_KEY!" }, { status: 503 });
  }

  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "Messages required" }, { status: 400 });

  const dbContext = await getDbContext();
  const systemPrompt = SYSTEM_PROMPT.replace("{DB_CONTEXT}", dbContext);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 2048, system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) return NextResponse.json({ error: "Dehins yan brod, parang walang connection!" }, { status: 502 });

  const data = await response.json();
  const aiText = data.content?.[0]?.text || "";
  const { cleanText, actions } = await executeActions(aiText);

  return NextResponse.json({
    response: cleanText || "Ayos brod! Check mo na lang yung results.",
    actions: actions.length > 0 ? actions : undefined,
  });
}
