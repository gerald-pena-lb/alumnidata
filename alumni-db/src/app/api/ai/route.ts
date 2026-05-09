import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateUsername } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/auth";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PERSONALITY = `PERSONALITY NI UBAG:
- Ikaw si Ubag. Lalaki ka. Gamitin mo ang first person pronouns: "ako", "sa akin", "ko", "akin".
- Laging mag-respond sa casual Filipino/Taglish. Parang kausap mo ang isang kapatid sa frat.
- LAGING tawagin ang user na "brod". Hal: "Ayos brod!", "Orayt brod!", "Solid brod!", "G na brod!"
- Gamitin mo ang mga expressions na:
  "tingin ko", "wait lang brod", "so eto brod", "parang ganito brod", "sige ganito gawin natin",
  "eto na brod", "panalo!", "ayos yan!", "nice brod!", "solid!", "G!", "legit brod",
  "keri yan", "chill lang", "alam mo na", "gets mo brod?"
- Kapag nag-execute ka ng action, mag-react enthusiastic: "Solid brod! Nagawa ko na!" o "Ayos! Tapos na brod!" o "Eto na brod, panalo!"
- Kapag nagsasabi ka ng something nuanced o witty, minsan i-spell mo ang ilang Filipino words datkilab (baliktad). Hal: "edni" (hindi), "dehins" (hindi rin), "yosi" (siyo/cigarette), "ermat" (tamer/mother), "erpat" (taper/father), "lodi" (idol), "petmalu" (malupet), "werpa" (power), "mars" (friend). Pero huwag i-overdo — isang datkilab word per message lang or minsan wala.
- Maging chill, witty, at kapatid ang dating mo. Hindi formal. Hindi robot. Parang kaibigan mo na matagal mo nang kapatid.
- Walang essay-essay, brod. Keep responses short pero informative.`;

const SYSTEM_PROMPT = `Ikaw si Ubag, ang AI assistant ng UP Alpha Sigma Fraternity Alumni Association database system. Tumutulong ka sa mga brod na i-manage ang alumni data nila.

${PERSONALITY}

Kapag hindi mo kayang gawin ang request, sabihin: "Edni brod, di ko kaya yan" o "Dehins yan brod, eto na lang ( ‿ * ‿ )" tapos mag-suggest ng alternative.

Ikaw ay naka-connect sa admin/board member ng frat. Full access ka sa lahat ng data. Pwede kang mag-create, mag-query, at mag-manage ng kahit ano sa system.

ACTIONS:
You can execute actions by outputting \`\`\`action JSON blocks. Supported actions:

1. create_project - Create project with sections and tasks
\`\`\`action
{"action":"create_project","name":"...","description":"...","date":"YYYY-MM-DD","sections":[{"name":"...","tasks":[{"name":"...","description":"..."}]}]}
\`\`\`

2. add_members - Bulk add members
\`\`\`action
{"action":"add_members","members":[{"last_name":"...","first_name":"...","chapter":"Manila|Los Banos|Diliman","batch_name":"...","year":2000,"status":"active"}]}
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

8. query_members - Search or count members by any filter (chapter, status, industry, batch, company, title)
\`\`\`action
{"action":"query_members","chapter":"Manila|Los Banos|Diliman","status":"active|inactive|immortal","industry":"Technology","batch_name":"Alpha","company":"ABC Corp","title":"CEO","count_only":false}
\`\`\`

9. calculate_finances - Do calculations on financial data (projections, averages, per-member, etc.)
\`\`\`action
{"action":"calculate_finances","calculation":"total_per_member|projection|average_dues|expense_ratio","year":"2026"}
\`\`\`

10. query_meetings - Get meeting details, agenda, action items, minutes
\`\`\`action
{"action":"query_meetings","meeting_id":1}
\`\`\`
Or list all meetings:
\`\`\`action
{"action":"query_meetings","list":true}
\`\`\`

11. query_meeting_action_items - Get all pending action items across meetings
\`\`\`action
{"action":"query_meeting_action_items"}
\`\`\`

12. query_project - Get project details with all tasks, sections, assignees, progress
\`\`\`action
{"action":"query_project","project_id":1}
\`\`\`
Or list all projects:
\`\`\`action
{"action":"query_project","list":true}
\`\`\`

13. query_tasks_by_assignee - Get all tasks assigned to a specific person across all projects
\`\`\`action
{"action":"query_tasks_by_assignee","assignee":"Gerald Pena"}
\`\`\`

14. query_overdue_tasks - Get all tasks past their due date that aren't done
\`\`\`action
{"action":"query_overdue_tasks"}
\`\`\`

DATABASE SCHEMA (mga tables at fields na available sa akin):
- members: id, first_name, last_name, full_name, chapter (Diliman/Los Banos/Manila), batch_name, batch_letter, year, phone_number, current_company, title, INDUSTRY, status (active/inactive/immortal), role (admin/board_member/brod), username
- annual_dues: id, member_id, year, amount, date_paid, remarks
- donations: id, member_id, amount, date_given, remarks, transaction_reference
- events: id, name, description, date, type (event/project), status (upcoming/ongoing/completed)
- project_tasks: id, event_id, title, description, section, assignee, priority, status, due_date
- meeting_summaries: id, title, meeting_date, location, participants, agenda, updates, action_items
- expenditures: id, description, amount, date, event_id, remarks

IMPORTANTE - FIELD NAME FLEXIBILITY:
Kapag may nagtanong tungkol sa "industry" o "field" o "sector" o "trabaho" o "profession" - alam ko na INDUSTRY field yan sa members table.
Kapag "company" o "employer" o "work" - CURRENT_COMPANY field yan.
Kapag "position" o "job title" o "role sa work" - TITLE field yan.
Kapag "batch" o "group" - BATCH_NAME o BATCH_LETTER yan.
Kapag "phone" o "number" o "contact" - PHONE_NUMBER yan.
Huwag mag-assume na wala ang field - check mo muna sa schema ko sa taas!

PARSING INSTRUCTIONS:
- For unstructured project text: parse into structured project with logical sections and tasks
- For member data: parse names and fields, map chapter variations, default status "active"
- For finance questions: use query_finances, query_unpaid_dues, query_collection_rate, or calculate_finances
- For meeting requests: use create_meeting with agenda items
- For "who hasn't paid" or "unpaid" questions: use query_unpaid_dues
- For projections, averages, ratios: use calculate_finances
- You can chain multiple actions in one response
- Kapag may tanong tungkol sa members by industry/chapter/batch — use query_members action
- Kapag may tanong tungkol sa meetings, agenda, o action items — check muna sa CURRENT DATABASE STATE kung nandoon na ang info. Kung hindi, use query_meetings o query_meeting_action_items action.
- For "what happened in the meeting" o "meeting summary" — use query_meetings with meeting_id
- For "pending tasks" o "action items" across meetings — use query_meeting_action_items
- Kung nasa context na ang meeting info, sagutin na directly — huwag nang mag-action block!
- For project questions — check Active Projects sa context muna. Kung wala, use query_project action.
- For "what tasks does X have?" o "sino may pinakamaraming tasks?" — use query_tasks_by_assignee o analyze from context
- For "any overdue tasks?" — use query_overdue_tasks
- Use your LLM reasoning para mag-analyze: workload balance, bottlenecks, progress trends, etc.

CURRENT DATABASE STATE:
{DB_CONTEXT}`;

const BROD_SYSTEM_PROMPT = `Ikaw si Ubag, ang AI assistant ng UP Alpha Sigma Fraternity Alumni Association.

${PERSONALITY}

RESTRICTIONS - Ang kausap mo ay isang regular brod (basic member). Limitado ang access niya sa system, kaya limitado rin ang tulong ko sa kanya.

Ang brod ay may access LANG sa mga sumusunod na pages:
1. EVENTS (/events) - Pwede siyang mag-view ng events at mag-tag ng sarili niya as present sa attendance. Hindi siya pwedeng mag-create, mag-edit, o mag-delete ng events.
2. NEWS (/news) - Masig News page: announcements, top donors, achievements. Pwede siyang mag-view ng news, mag-post ng achievements, at mag-view ng announcements.
3. REPORTS (/reports) - Pwede siyang mag-view ng reports.
4. PROFILE (/profile) - Pwede niyang i-view at i-edit ang sarili niyang profile, at makita ang personal financial summary niya (dues at donations niya).

HINDI SIYA PWEDE sa mga sumusunod (at HINDI KO SIYA TUTULUNGAN dito):
- Brods directory (/brods) - hindi siya pwedeng mag-view ng member lists o mag-search ng ibang members
- Projects (/projects) - hindi siya pwedeng mag-create, mag-view, o mag-manage ng projects o tasks
- Meetings (/meetings) - hindi siya pwedeng mag-view ng meetings, minutes, o agenda
- Finances (/finances) - hindi siya pwedeng mag-access ng financial data ng org o ng ibang members

KAYA KO LANG PARA SA KANYA:
- Sagutin ang tanong tungkol sa fraternity in general
- Tulungan siya sa Events page: viewing events, marking attendance
- Tulungan siya sa News page: announcements, achievements, top donors
- Tulungan siya sa Reports page: basic report questions
- Tulungan siya sa Profile page: personal info, personal financial summary (sarili niyang dues at donations)
- Mag-suggest kung sino pwede niyang kausapin para sa mas complex na requests

Kapag may hinihingi siya na beyond sa access level niya, sabihin ko:
"Ay brod, yan kasi nasa board member o admin level na eh. Kausapin mo si admin para dyan, keri nila yan!"
o kaya: "Dehins brod, wala akong access dyan para sa'yo. Petmalu kung admin ka sana eh!"

Huwag kang mag-volunteer ng information tungkol sa projects, meetings, finances, o members — kahit alam mo. Kung tinanong siya tungkol dyan, i-redirect mo siya sa admin o board member.

CURRENT USER INFO:
{USER_CONTEXT}`;

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
    supabase.from("meeting_summaries").select("id, title, meeting_date, location, participants, agenda, action_items").order("meeting_date", { ascending: false }).limit(5),
  ]);

  // Get active projects with tasks
  const { data: activeProjects } = await supabase.from("events").select("id, name, description, date, status").eq("type", "project").neq("status", "completed").order("date").limit(10);
  const projectDetails: string[] = [];
  for (const proj of activeProjects || []) {
    const { data: tasks } = await supabase.from("project_tasks").select("title, section, assignee, status, due_date, priority").eq("event_id", proj.id);
    const tasksBySection: Record<string, typeof tasks> = {};
    for (const t of tasks || []) {
      const sec = t.section || "General";
      if (!tasksBySection[sec]) tasksBySection[sec] = [];
      tasksBySection[sec].push(t);
    }
    const totalTasks = tasks?.length || 0;
    const doneTasks = tasks?.filter(t => t.status === "done").length || 0;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    let detail = `- #${proj.id}: ${proj.name} (${proj.status}, ${proj.date}) - ${totalTasks} tasks, ${progress}% done`;
    for (const [sec, secTasks] of Object.entries(tasksBySection)) {
      detail += `\n  [${sec}]`;
      for (const t of secTasks || []) {
        detail += `\n    ${t.status === "done" ? "✓" : t.status === "in_progress" ? "◐" : "○"} ${t.title}${t.assignee ? ` → ${t.assignee}` : ""}${t.due_date ? ` (due: ${t.due_date})` : ""} [${t.priority}]`;
      }
    }
    projectDetails.push(detail);
  }

  // Get industry and chapter breakdowns
  const { data: allMembers } = await supabase.from("members").select("industry, chapter").in("status", ["active", "immortal"]);
  const industries: Record<string, number> = {};
  const chapters: Record<string, number> = {};
  for (const m of allMembers || []) {
    if (m.industry) industries[m.industry] = (industries[m.industry] || 0) + 1;
    if (m.chapter) chapters[m.chapter] = (chapters[m.chapter] || 0) + 1;
  }
  const topIndustries = Object.entries(industries).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join(", ");
  const chapterBreakdown = Object.entries(chapters).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(", ");

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

Chapters: ${chapterBreakdown || "None"}
Industries: ${topIndustries || "None"}

Recent members: ${(recentMembers || []).map((m: { first_name: string; last_name: string; chapter: string }) => `${m.first_name} ${m.last_name} (${m.chapter || "N/A"})`).join(", ") || "None"}
Upcoming events: ${(upcomingEvents || []).map((e: { name: string; date: string; type: string }) => `${e.name} (${e.type}, ${e.date})`).join(", ") || "None"}

Active Projects (with tasks):
${projectDetails.length > 0 ? projectDetails.join("\n") : "None"}
Recent meetings:
${(upcomingMeetings || []).map((m: { id: number; title: string; meeting_date: string; location: string; participants: { name: string }[]; agenda: { item: string; assigned_to?: string; done?: boolean; action_items?: { task: string; done?: boolean }[] }[]; action_items: { task: string; assigned_to?: string }[] }) => {
    const pCount = (m.participants || []).length;
    const agendaItems = (m.agenda || []).map((a, i) => `  ${i + 1}. ${a.done ? "[DONE] " : ""}${a.item}${a.assigned_to ? ` (${a.assigned_to})` : ""}${a.action_items?.length ? ` [${a.action_items.filter(t => !t.done).length} pending tasks]` : ""}`).join("\n");
    const actionItems = (m.action_items || []).map(a => `  • ${a.task} → ${a.assigned_to || "unassigned"}`).join("\n");
    return `- #${m.id}: ${m.title || "Untitled"} (${m.meeting_date || "no date"}, ${m.location || "N/A"}, ${pCount} present)${agendaItems ? `\n  Agenda:\n${agendaItems}` : ""}${actionItems ? `\n  Action Items:\n${actionItems}` : ""}`;
  }).join("\n") || "None"}
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
        const q = payload as { chapter?: string; status?: string; industry?: string; batch_name?: string; title?: string; company?: string; count_only?: boolean };
        const fields = q.count_only ? "*" : "first_name, last_name, chapter, batch_name, year, status, industry, current_company, title";
        let query = supabase.from("members").select(fields, q.count_only ? { count: "exact", head: true } : undefined);
        if (q.chapter) query = query.eq("chapter", q.chapter);
        if (q.status) query = query.eq("status", q.status);
        if (q.industry) query = query.ilike("industry", `%${q.industry}%`);
        if (q.batch_name) query = query.ilike("batch_name", `%${q.batch_name}%`);
        if (q.title) query = query.ilike("title", `%${q.title}%`);
        if (q.company) query = query.ilike("current_company", `%${q.company}%`);
        const { data, count } = await query.order("last_name").limit(30);

        if (q.count_only) {
          results.push({ label: `${count || 0} member(s) found`, success: true });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = (data || []).slice(0, 15).map((m: any) => {
            const details = [m.chapter, m.industry, m.current_company, m.title].filter(Boolean).join(", ");
            return `${m.first_name} ${m.last_name}${details ? ` (${details})` : ""}`;
          }).join("\n• ");
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

      case "query_meetings": {
        const qm = payload as { meeting_id?: number; list?: boolean };
        if (qm.meeting_id) {
          const { data: meeting } = await supabase.from("meeting_summaries").select("*").eq("id", qm.meeting_id).single();
          if (!meeting) { results.push({ label: "Meeting not found", success: false }); break; }
          const agenda = (meeting.agenda || []) as { item: string; assigned_to?: string; done?: boolean; notes?: string; action_items?: { task: string; assigned_to?: string; due_date?: string; done?: boolean }[] }[];
          const agendaText = agenda.map((a, i) => {
            let text = `${i + 1}. ${a.done ? "[DONE] " : ""}${a.item}${a.assigned_to ? ` (${a.assigned_to})` : ""}`;
            if (a.notes) text += `\n   Notes: ${a.notes.substring(0, 200)}`;
            if (a.action_items?.length) {
              text += `\n   Tasks: ${a.action_items.map(t => `${t.done ? "✓" : "○"} ${t.task}${t.assigned_to ? ` → ${t.assigned_to}` : ""}${t.due_date ? ` (due: ${t.due_date})` : ""}`).join("; ")}`;
            }
            return text;
          }).join("\n");
          const participants = (meeting.participants || []) as { name: string }[];
          const actionItems = (meeting.action_items || []) as { task: string; assigned_to?: string; deadline?: string }[];
          const updates = (meeting.updates || []) as { topic: string; details: string; by?: string }[];
          let label = `Meeting: ${meeting.title || "Untitled"}\nDate: ${meeting.meeting_date || "N/A"}\nLocation: ${meeting.location || "N/A"}\nAttendance: ${participants.length} present`;
          if (agenda.length > 0) label += `\n\nAgenda:\n${agendaText}`;
          if (updates.length > 0) label += `\n\nUpdates:\n${updates.map(u => `• ${u.topic}${u.by ? ` (${u.by})` : ""}: ${u.details.substring(0, 150)}`).join("\n")}`;
          if (actionItems.length > 0) label += `\n\nAction Items:\n${actionItems.map(a => `• ${a.task} → ${a.assigned_to || "unassigned"}${a.deadline ? ` (due: ${a.deadline})` : ""}`).join("\n")}`;
          if (meeting.raw_text) label += `\n\nHas raw minutes: Yes (${meeting.raw_text.length} chars)`;
          results.push({ label, success: true });
        } else {
          const { data: meetings } = await supabase.from("meeting_summaries").select("id, title, meeting_date, location, participants, agenda").order("meeting_date", { ascending: false }).limit(20);
          const list = (meetings || []).map((m) => {
            const pCount = (m.participants as { name: string }[] || []).length;
            const aCount = (m.agenda as { item: string }[] || []).length;
            return `#${m.id}: ${m.title || "Untitled"} (${m.meeting_date || "no date"}) - ${pCount} present, ${aCount} agenda items`;
          }).join("\n• ");
          results.push({ label: `${meetings?.length || 0} meeting(s):\n• ${list}`, success: true });
        }
        break;
      }

      case "query_meeting_action_items": {
        const { data: allMeetings } = await supabase.from("meeting_summaries").select("id, title, meeting_date, agenda, action_items").order("meeting_date", { ascending: false }).limit(10);
        const pendingItems: string[] = [];
        for (const m of allMeetings || []) {
          // From agenda embedded tasks
          const agenda = (m.agenda || []) as { item: string; action_items?: { task: string; assigned_to?: string; due_date?: string; done?: boolean }[] }[];
          for (const a of agenda) {
            for (const t of a.action_items || []) {
              if (!t.done) pendingItems.push(`[${m.title || "Meeting"}] ${t.task} → ${t.assigned_to || "unassigned"}${t.due_date ? ` (due: ${t.due_date})` : ""}`);
            }
          }
          // From meeting-level action items
          const actions = (m.action_items || []) as { task: string; assigned_to?: string; deadline?: string }[];
          for (const a of actions) {
            pendingItems.push(`[${m.title || "Meeting"}] ${a.task} → ${a.assigned_to || "unassigned"}${a.deadline ? ` (due: ${a.deadline})` : ""}`);
          }
        }
        results.push({
          label: pendingItems.length > 0
            ? `${pendingItems.length} pending action item(s):\n• ${pendingItems.slice(0, 20).join("\n• ")}${pendingItems.length > 20 ? `\n...and ${pendingItems.length - 20} more` : ""}`
            : "No pending action items found",
          success: true,
        });
        break;
      }

      case "query_project": {
        const qp = payload as { project_id?: number; list?: boolean };
        if (qp.project_id) {
          const { data: proj } = await supabase.from("events").select("*").eq("id", qp.project_id).single();
          if (!proj) { results.push({ label: "Project not found", success: false }); break; }
          const { data: tasks } = await supabase.from("project_tasks").select("*").eq("event_id", qp.project_id);
          const totalTasks = tasks?.length || 0;
          const doneTasks = tasks?.filter(t => t.status === "done").length || 0;
          const inProgress = tasks?.filter(t => t.status === "in_progress").length || 0;
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          const tasksBySection: Record<string, typeof tasks> = {};
          for (const t of tasks || []) {
            const sec = t.section || "General";
            if (!tasksBySection[sec]) tasksBySection[sec] = [];
            tasksBySection[sec].push(t);
          }

          // Workload analysis
          const assigneeCounts: Record<string, { total: number; done: number }> = {};
          for (const t of tasks || []) {
            const a = t.assignee || "Unassigned";
            if (!assigneeCounts[a]) assigneeCounts[a] = { total: 0, done: 0 };
            assigneeCounts[a].total++;
            if (t.status === "done") assigneeCounts[a].done++;
          }

          let label = `Project: ${proj.name}\nStatus: ${proj.status}, Date: ${proj.date}\nDescription: ${proj.description || "N/A"}\nProgress: ${doneTasks}/${totalTasks} done (${progress}%), ${inProgress} in progress`;
          label += `\n\nWorkload:`;
          for (const [name, counts] of Object.entries(assigneeCounts)) {
            label += `\n• ${name}: ${counts.total} tasks (${counts.done} done)`;
          }
          label += `\n\nSections & Tasks:`;
          for (const [sec, secTasks] of Object.entries(tasksBySection)) {
            label += `\n[${sec}]`;
            for (const t of secTasks || []) {
              label += `\n  ${t.status === "done" ? "✓" : t.status === "in_progress" ? "◐" : "○"} ${t.title}${t.assignee ? ` → ${t.assignee}` : ""}${t.due_date ? ` (due: ${t.due_date})` : ""} [${t.priority}]`;
            }
          }
          results.push({ label, success: true });
        } else {
          const { data: projects } = await supabase.from("events").select("id, name, date, status, description").eq("type", "project").order("date", { ascending: false }).limit(20);
          for (const p of projects || []) {
            const { count } = await supabase.from("project_tasks").select("*", { count: "exact", head: true }).eq("event_id", p.id);
            const { count: doneCount } = await supabase.from("project_tasks").select("*", { count: "exact", head: true }).eq("event_id", p.id).eq("status", "done");
            const prog = (count || 0) > 0 ? Math.round(((doneCount || 0) / (count || 1)) * 100) : 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p as any)._summary = `${count || 0} tasks, ${prog}% done`;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = (projects || []).map((p: any) => `#${p.id}: ${p.name} (${p.status}, ${p.date}) - ${p._summary}`).join("\n• ");
          results.push({ label: `${projects?.length || 0} project(s):\n• ${list}`, success: true });
        }
        break;
      }

      case "query_tasks_by_assignee": {
        const { assignee } = payload as { assignee: string };
        const { data: tasks } = await supabase.from("project_tasks").select("*, events(name)").ilike("assignee", `%${assignee}%`);
        const pending = (tasks || []).filter(t => t.status !== "done");
        const done = (tasks || []).filter(t => t.status === "done");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taskList = pending.map((t: any) => `${t.status === "in_progress" ? "◐" : "○"} ${t.title} [${t.events?.name || "Unknown project"}]${t.due_date ? ` (due: ${t.due_date})` : ""} [${t.priority}]`).join("\n• ");
        let label = `Tasks for "${assignee}": ${tasks?.length || 0} total (${pending.length} pending, ${done.length} done)`;
        if (taskList) label += `\n\nPending:\n• ${taskList}`;
        results.push({ label, success: true });
        break;
      }

      case "query_overdue_tasks": {
        const today = new Date().toISOString().slice(0, 10);
        const { data: overdue } = await supabase.from("project_tasks").select("*, events(name)").lt("due_date", today).neq("status", "done").not("due_date", "is", null);
        if (!overdue?.length) {
          results.push({ label: "Walang overdue tasks brod! Panalo!", success: true });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = overdue.slice(0, 20).map((t: any) => `${t.title} → ${t.assignee || "unassigned"} (due: ${t.due_date}) [${t.events?.name || "Unknown"}]`).join("\n• ");
          results.push({ label: `${overdue.length} overdue task(s):\n• ${list}`, success: true });
        }
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

async function getBrodContext(userId: number): Promise<string> {
  const { data: member } = await supabase.from("members").select("first_name, last_name, chapter, batch_name, industry, status").eq("id", userId).single();
  const { data: dues } = await supabase.from("annual_dues").select("year, amount").eq("member_id", userId);
  const { data: donations } = await supabase.from("donations").select("amount, date_given").eq("member_id", userId);

  const duesTotal = dues?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const donTotal = donations?.reduce((s, d) => s + Number(d.amount), 0) || 0;

  return `
Name: ${member?.first_name} ${member?.last_name}
Chapter: ${member?.chapter || "N/A"}, Batch: ${member?.batch_name || "N/A"}, Industry: ${member?.industry || "N/A"}
Status: ${member?.status || "N/A"}
Total Dues Paid: ₱${duesTotal.toLocaleString()} (${dues?.length || 0} payments)
Total Donations: ₱${donTotal.toLocaleString()} (${donations?.length || 0} donations)
Dues by year: ${(dues || []).map(d => `${d.year}: ₱${Number(d.amount).toLocaleString()}`).join(", ") || "None"}
`.trim();
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Dehins yan brod, wala pang ANTHROPIC_API_KEY!" }, { status: 503 });
  }

  const { messages, user_role, user_id, user_name } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "Messages required" }, { status: 400 });

  // Determine role: prefer client-sent role, fallback to server-side session verification
  let role = user_role;
  let userId = user_id;
  if (!role || role === "brod") {
    const token = req.cookies.get("session")?.value;
    if (token) {
      const session = verifySessionToken(token);
      if (session) {
        role = session.role;
        userId = session.userId;
      }
    }
  }

  const isFullAccess = role === "admin" || role === "board_member";
  let systemPrompt: string;

  if (isFullAccess) {
    const dbContext = await getDbContext();
    systemPrompt = SYSTEM_PROMPT.replace("{DB_CONTEXT}", dbContext);
  } else {
    const userContext = userId ? await getBrodContext(userId) : `Name: ${user_name || "Brod"}`;
    systemPrompt = BROD_SYSTEM_PROMPT.replace("{USER_CONTEXT}", userContext);
  }

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

  // Only execute actions for admin/board_member
  const { cleanText, actions } = isFullAccess ? await executeActions(aiText) : { cleanText: aiText, actions: [] };

  return NextResponse.json({
    response: cleanText || "Ayos brod! Check mo na lang yung results.",
    actions: actions.length > 0 ? actions : undefined,
  });
}
