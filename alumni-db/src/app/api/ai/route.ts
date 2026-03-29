import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateUsername } from "@/lib/supabase";

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

2. add_members - Bulk add members
\`\`\`action
{"action":"add_members","members":[{"last_name":"...","first_name":"...","chapter":"Manila|Los Banos|Diliman","batch_name":"...","year":2000,"status":"alive|deceased"}]}
\`\`\`

3. create_event - Create an event
\`\`\`action
{"action":"create_event","name":"...","description":"...","date":"YYYY-MM-DD","status":"upcoming|ongoing|completed"}
\`\`\`

4. create_meeting - Create a meeting with agenda
\`\`\`action
{"action":"create_meeting","title":"...","meeting_date":"YYYY-MM-DD","location":"...","agenda":[{"item":"...","assigned_to":"..."}]}
\`\`\`

5. query_finances - Get financial summary for a year
\`\`\`action
{"action":"query_finances","year":"2026"}
\`\`\`

6. query_unpaid_dues - Check who hasn't paid dues for a year
\`\`\`action
{"action":"query_unpaid_dues","year":"2026"}
\`\`\`

7. query_collection_rate - Get collection rate stats
\`\`\`action
{"action":"query_collection_rate","year":"2026"}
\`\`\`

8. query_members - Search or count members by filters
\`\`\`action
{"action":"query_members","chapter":"Manila|Los Banos|Diliman","status":"alive|deceased","count_only":true}
\`\`\`

9. calculate_finances - Do calculations on financial data (projections, averages, per-member, etc.)
\`\`\`action
{"action":"calculate_finances","calculation":"total_per_member|projection|average_dues|expense_ratio","year":"2026"}
\`\`\`

PARSING INSTRUCTIONS:
- For unstructured project text: parse into structured project with logical sections and tasks
- For member data: parse names and fields, map chapter variations, default status "active"
- For finance questions: use query_finances, query_unpaid_dues, query_collection_rate, or calculate_finances
- For meeting requests: use create_meeting with agenda items
- For "who hasn't paid" or "unpaid" questions: use query_unpaid_dues
- For projections, averages, ratios: use calculate_finances
- You can chain multiple actions in one response
- Walang essay-essay, brod. Keep responses short but informative for data queries.

CURRENT DATABASE STATE:
{DB_CONTEXT}`;

async function getDbContext(): Promise<string> {
  const y = new Date().getFullYear();

  const [
    { count: memberCount },
    { count: activeCount },
    { count: eventCount },
    { count: projectCount },
    { count: taskCount },
    { count: meetingCount },
    { data: dues },
    { data: donations },
    { data: expenditures },
    { data: paidMembers },
    { data: recentMembers },
    { data: upcomingEvents },
    { data: upcomingMeetings },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("members").select("*", { count: "exact", head: true }).in("status", ["active", "immortal"]),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("type", "project"),
    supabase.from("project_tasks").select("*", { count: "exact", head: true }),
    supabase.from("meeting_summaries").select("*", { count: "exact", head: true }),
    supabase.from("annual_dues").select("amount").eq("year", y),
    supabase.from("donations").select("amount").gte("date_given", `${y}-01-01`).lte("date_given", `${y}-12-31`),
    supabase.from("expenditures").select("amount").gte("date", `${y}-01-01`).lte("date", `${y}-12-31`),
    supabase.from("annual_dues").select("member_id").eq("year", y),
    supabase.from("members").select("first_name, last_name, chapter").in("status", ["active", "immortal"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("events").select("name, date, type, status").neq("status", "completed").order("date").limit(5),
    supabase.from("meeting_summaries").select("title, meeting_date").order("meeting_date", { ascending: false }).limit(3),
  ]);

  const duesTotal = dues?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const donTotal = donations?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const expTotal = expenditures?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const uniquePaid = new Set(paidMembers?.map((d) => d.member_id)).size;
  const active = activeCount || 0;
  const collectionRate = active > 0 ? ((uniquePaid / active) * 100).toFixed(1) : "0";

  return `
Members: ${memberCount || 0} total, ${active} active
Events: ${eventCount || 0}, Projects: ${projectCount || 0}, Tasks: ${taskCount || 0}, Meetings: ${meetingCount || 0}

FINANCES (${y}):
- Dues collected: ₱${duesTotal.toLocaleString()} (${uniquePaid}/${active} members paid, ${collectionRate}% collection rate)
- Donations: ₱${donTotal.toLocaleString()}
- Expenditures: ₱${expTotal.toLocaleString()}
- Net income: ₱${(duesTotal + donTotal - expTotal).toLocaleString()}
- Unpaid members: ${active - uniquePaid}

Recent members: ${(recentMembers || []).map((m: { first_name: string; last_name: string; chapter: string }) => `${m.first_name} ${m.last_name} (${m.chapter || "N/A"})`).join(", ") || "None"}
Upcoming events: ${(upcomingEvents || []).map((e: { name: string; date: string; type: string }) => `${e.name} (${e.type}, ${e.date})`).join(", ") || "None"}
Recent meetings: ${(upcomingMeetings || []).map((m: { title: string; meeting_date: string }) => `${m.title || "Untitled"} (${m.meeting_date || "no date"})`).join(", ") || "None"}
`.trim();
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
                await supabase.from("project_tasks").insert({ event_id: data.id, title: task.name, description: task.description || null, section: section.name, status: "todo" });
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
          const firstName = m.first_name || "";
          const lastName = m.last_name || "";
          const fullName = `${firstName} ${lastName}`.trim();
          const chapter = m.chapter ? (chapterMap[m.chapter.toLowerCase()] || m.chapter) : null;
          const { error } = await supabase.from("members").insert({
            first_name: firstName, last_name: lastName, full_name: fullName,
            chapter, batch_name: m.batch_name || chapter, year: m.year || null, status: m.status || "active",
            username: generateUsername(fullName), password_hash: "masig123", role: "brod",
          });
          if (!error) count++;
        }
        results.push({ label: `${count} member(s) added`, success: true });
        break;
      }

      case "create_event": {
        const e = payload as { name: string; description?: string; date: string; status?: string };
        await supabase.from("events").insert({
          name: e.name, description: e.description || null,
          date: e.date || new Date().toISOString().slice(0, 10), type: "event", status: e.status || "upcoming",
        });
        results.push({ label: `Event "${e.name}" created`, success: true });
        break;
      }

      case "create_meeting": {
        const m = payload as { title: string; meeting_date?: string; location?: string; agenda?: { item: string; assigned_to?: string }[] };
        const { data, error } = await supabase.from("meeting_summaries").insert({
          title: m.title, meeting_date: m.meeting_date || null, location: m.location || null,
          agenda: m.agenda || [], raw_text: "", participants: [], updates: [],
          action_items: [], previous_action_items: [],
        }).select("id").single();
        if (error) {
          results.push({ label: `Dehins yan brod: ${error.message}`, success: false });
        } else {
          const agendaCount = m.agenda?.length || 0;
          results.push({ label: `Meeting "${m.title}" created${agendaCount > 0 ? ` with ${agendaCount} agenda item(s)` : ""}`, success: true });
        }
        break;
      }

      case "query_finances": {
        const y = Number((payload as { year: string }).year);
        const [{ data: d }, { data: don }, { data: exp }] = await Promise.all([
          supabase.from("annual_dues").select("amount").eq("year", y),
          supabase.from("donations").select("amount").gte("date_given", `${y}-01-01`).lte("date_given", `${y}-12-31`),
          supabase.from("expenditures").select("amount").gte("date", `${y}-01-01`).lte("date", `${y}-12-31`),
        ]);
        const dt = d?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const dnt = don?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const et = exp?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        results.push({
          label: `${y} Finances:\n• Dues: ₱${dt.toLocaleString()}\n• Donations: ₱${dnt.toLocaleString()}\n• Expenditures: ₱${et.toLocaleString()}\n• Total Income: ₱${(dt + dnt).toLocaleString()}\n• Net: ₱${(dt + dnt - et).toLocaleString()}`,
          success: true,
        });
        break;
      }

      case "query_unpaid_dues": {
        const y = Number((payload as { year: string }).year);
        const { data: allActive } = await supabase.from("members").select("id, first_name, last_name, chapter").in("status", ["active", "immortal"]);
        const { data: paid } = await supabase.from("annual_dues").select("member_id").eq("year", y);
        const paidIds = new Set(paid?.map((p) => p.member_id) || []);
        const unpaid = (allActive || []).filter((m) => !paidIds.has(m.id));
        const unpaidList = unpaid.slice(0, 20).map((m) => `${m.first_name} ${m.last_name} (${m.chapter || "N/A"})`).join("\n• ");
        results.push({
          label: `${y} Unpaid Dues: ${unpaid.length} of ${allActive?.length || 0} active members\n${unpaid.length > 0 ? `• ${unpaidList}` : ""}${unpaid.length > 20 ? `\n...and ${unpaid.length - 20} more` : ""}`,
          success: true,
        });
        break;
      }

      case "query_collection_rate": {
        const y = Number((payload as { year: string }).year);
        const { count: active } = await supabase.from("members").select("*", { count: "exact", head: true }).in("status", ["active", "immortal"]);
        const { data: paid } = await supabase.from("annual_dues").select("member_id, amount").eq("year", y);
        const uniquePaid = new Set(paid?.map((p) => p.member_id)).size;
        const totalCollected = paid?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const rate = (active || 0) > 0 ? ((uniquePaid / (active || 1)) * 100).toFixed(1) : "0";
        const avgPerMember = uniquePaid > 0 ? (totalCollected / uniquePaid).toFixed(0) : "0";
        results.push({
          label: `${y} Collection Rate:\n• Paid: ${uniquePaid}/${active || 0} members (${rate}%)\n• Total Collected: ₱${totalCollected.toLocaleString()}\n• Avg per paying member: ₱${Number(avgPerMember).toLocaleString()}\n• Outstanding: ${(active || 0) - uniquePaid} unpaid`,
          success: true,
        });
        break;
      }

      case "query_members": {
        const q = payload as { chapter?: string; status?: string; count_only?: boolean };
        let query = supabase.from("members").select(q.count_only ? "*" : "first_name, last_name, chapter, batch_name, year, status", q.count_only ? { count: "exact", head: true } : undefined);
        if (q.chapter) query = query.eq("chapter", q.chapter);
        if (q.status) query = query.eq("status", q.status);
        const { data, count } = await query.order("last_name").limit(30);

        if (q.count_only) {
          results.push({ label: `${count || 0} member(s) found`, success: true });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = (data || []).slice(0, 15).map((m: any) =>
            `${m.first_name} ${m.last_name} (${m.chapter || "N/A"}, ${m.batch_name || "N/A"})`
          ).join("\n• ");
          results.push({
            label: `${data?.length || 0} member(s):\n• ${list}${(data?.length || 0) > 15 ? `\n...and ${(data?.length || 0) - 15} more` : ""}`,
            success: true,
          });
        }
        break;
      }

      case "calculate_finances": {
        const calc = payload as { calculation: string; year: string };
        const y = Number(calc.year);
        const { count: active } = await supabase.from("members").select("*", { count: "exact", head: true }).in("status", ["active", "immortal"]);
        const { data: d } = await supabase.from("annual_dues").select("amount, member_id").eq("year", y);
        const { data: don } = await supabase.from("donations").select("amount").gte("date_given", `${y}-01-01`).lte("date_given", `${y}-12-31`);
        const { data: exp } = await supabase.from("expenditures").select("amount").gte("date", `${y}-01-01`).lte("date", `${y}-12-31`);

        const duesTotal = d?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const donTotal = don?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const expTotal = exp?.reduce((s, r) => s + Number(r.amount), 0) || 0;
        const totalIncome = duesTotal + donTotal;
        const uniquePaid = new Set(d?.map((p) => p.member_id)).size;
        const unpaid = (active || 0) - uniquePaid;

        let label = `${y} Financial Analysis:\n`;
        switch (calc.calculation) {
          case "total_per_member":
            label += `• Income per active member: ₱${active ? (totalIncome / active).toFixed(0) : 0}\n• Dues per paying member: ₱${uniquePaid ? (duesTotal / uniquePaid).toFixed(0) : 0}\n• If all ${active} paid: potential ₱${active ? (duesTotal / uniquePaid * (active || 1)).toFixed(0) : 0}`;
            break;
          case "projection":
            label += `• Current collection: ${uniquePaid}/${active} (${((uniquePaid / (active || 1)) * 100).toFixed(0)}%)\n• If 100% collection: ₱${active && uniquePaid ? ((duesTotal / uniquePaid) * active).toLocaleString() : "0"}\n• Revenue gap: ₱${active && uniquePaid ? ((duesTotal / uniquePaid) * unpaid).toLocaleString() : "0"}\n• Net projection (100%): ₱${active && uniquePaid ? ((duesTotal / uniquePaid) * active + donTotal - expTotal).toLocaleString() : "0"}`;
            break;
          case "average_dues":
            label += `• Average dues paid: ₱${uniquePaid ? (duesTotal / uniquePaid).toFixed(0) : 0}\n• Total dues payers: ${uniquePaid}\n• Average donation: ₱${don?.length ? (donTotal / don.length).toFixed(0) : 0}`;
            break;
          case "expense_ratio":
            label += `• Expense ratio: ${totalIncome > 0 ? ((expTotal / totalIncome) * 100).toFixed(1) : 0}%\n• Income: ₱${totalIncome.toLocaleString()}\n• Expenses: ₱${expTotal.toLocaleString()}\n• Surplus: ₱${(totalIncome - expTotal).toLocaleString()}`;
            break;
          default:
            label += `• Total Income: ₱${totalIncome.toLocaleString()} (Dues ₱${duesTotal.toLocaleString()} + Donations ₱${donTotal.toLocaleString()})\n• Expenditures: ₱${expTotal.toLocaleString()}\n• Net: ₱${(totalIncome - expTotal).toLocaleString()}\n• Paid: ${uniquePaid}/${active} members\n• Per member avg: ₱${active ? (totalIncome / active).toFixed(0) : 0}`;
        }
        results.push({ label, success: true });
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
