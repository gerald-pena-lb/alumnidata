"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import PrintHeader from "@/components/PrintHeader";

interface Participant { name: string; role: string | null; }
interface Update { topic: string; details: string; by: string | null; }
interface ActionItem { task: string; assigned_to: string; deadline: string | null; }
interface PrevActionItem { task: string; assigned_to: string; status: "done" | "pending"; remarks: string | null; }
interface AgendaItem { item: string; assigned_to: string | null; notes: string | null; done?: boolean; }

interface Meeting {
  id: number;
  raw_text: string;
  title: string;
  meeting_date: string;
  location: string;
  participants: Participant[];
  updates: Update[];
  action_items: ActionItem[];
  previous_action_items: PrevActionItem[];
  agenda: AgendaItem[];
  created_at: string;
}

const LOADING_PHRASES = [
  "Binabasa ko yung minutes, brod...",
  "Teka lang, sine-summarize ko pa...",
  "Sinusuri ko yung notes mo, brod...",
  "Hintay lang, ini-identify ko pa yung action items...",
];

function formatDateLong(d: string): string {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

interface BoardMember { id: number; full_name: string; }

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Meeting | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // Minutes input
  const [rawText, setRawText] = useState("");
  const [showMinutesInput, setShowMinutesInput] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const phraseRef = useRef<NodeJS.Timeout | null>(null);

  // Push action items prompt
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [nextMeetings, setNextMeetings] = useState<{ id: number; title: string; meeting_date: string }[]>([]);
  const [selectedNextMeeting, setSelectedNextMeeting] = useState<number | "new">("new");
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");

  // Edit state
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [prevItems, setPrevItems] = useState<PrevActionItem[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [allMembers, setAllMembers] = useState<{ id: number; first_name: string; last_name: string; full_name: string; chapter: string }[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);
  const [summarizingIdx, setSummarizingIdx] = useState<number | null>(null);
  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [creatingTasks, setCreatingTasks] = useState(false);

  useEffect(() => {
    if (summarizing) {
      let idx = 0;
      setLoadingPhrase(LOADING_PHRASES[0]);
      phraseRef.current = setInterval(() => { idx = (idx + 1) % LOADING_PHRASES.length; setLoadingPhrase(LOADING_PHRASES[idx]); }, 3000);
    } else if (phraseRef.current) clearInterval(phraseRef.current);
    return () => { if (phraseRef.current) clearInterval(phraseRef.current); };
  }, [summarizing]);

  async function load() {
    const res = await fetch(`/api/minutes/${id}`);
    if (!res.ok) return;
    const d = await res.json();
    setData(d);
    setTitle(d.title || "");
    setMeetingDate(d.meeting_date || "");
    setLocation(d.location || "");
    setParticipants(d.participants || []);
    setUpdates(d.updates || []);
    setActionItems(d.action_items || []);
    setPrevItems(d.previous_action_items || []);
    setAgenda(d.agenda || []);
  }

  async function summarizeNotes(idx: number, rawText: string, agendaItem: string, target: "edit" | "view") {
    setSummarizingIdx(idx);
    try {
      const res = await fetch("/api/minutes/summarize-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, agenda_item: agendaItem }),
      });
      if (!res.ok) throw new Error("Summarization failed");
      const { summary } = await res.json();
      if (target === "edit") {
        const arr = [...agenda]; arr[idx] = { ...arr[idx], notes: summary }; setAgenda(arr);
      } else {
        // Save directly to DB in view mode
        const updated = [...(data?.agenda || [])];
        updated[idx] = { ...updated[idx], notes: summary };
        await fetch(`/api/minutes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agenda: updated }),
        });
        setEditingNoteIdx(null);
        setNoteDraft("");
        load();
      }
    } catch {
      alert("Failed to summarize notes");
    }
    setSummarizingIdx(null);
  }

  useEffect(() => {
    load();
    fetch("/api/members?role=board_and_admin").then((r) => r.json()).then(setBoardMembers);
    fetch("/api/members?status=alive").then((r) => r.json()).then(setAllMembers);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    await fetch(`/api/minutes/${id}`, { method: "DELETE" });
    router.push("/meetings");
  }

  async function handleSave() {
    await fetch(`/api/minutes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meeting_date: meetingDate, location, participants, updates, action_items: actionItems, previous_action_items: prevItems, agenda }),
    });
    setEditing(false);
    load();
  }

  async function handleSummarize() {
    if (!rawText.trim()) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/minutes/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });
      if (!res.ok) throw new Error("AI summarization failed");
      const parsed = await res.json();

      // Merge with existing data
      setParticipants(parsed.participants || []);
      setUpdates(parsed.updates || []);
      setActionItems(parsed.action_items || []);
      setPrevItems(parsed.previous_action_items || []);
      if (parsed.title && !title) setTitle(parsed.title);
      if (parsed.meeting_date && !meetingDate) setMeetingDate(parsed.meeting_date);
      if (parsed.location && !location) setLocation(parsed.location);

      // Save to DB
      await fetch(`/api/minutes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          title: parsed.title || title,
          meeting_date: parsed.meeting_date || meetingDate,
          location: parsed.location || location,
          participants: parsed.participants || [],
          updates: parsed.updates || [],
          action_items: parsed.action_items || [],
          previous_action_items: parsed.previous_action_items || [],
        }),
      });

      setShowMinutesInput(false);
      load();

      // If there are action items, prompt to push to next meeting
      if (parsed.action_items?.length > 0) {
        const allMeetings = await fetch("/api/minutes").then((r) => r.json());
        const future = allMeetings.filter((m: Meeting) => m.id !== Number(id) && m.meeting_date && m.meeting_date > (parsed.meeting_date || meetingDate || ""));
        setNextMeetings(future);
        setShowPushPrompt(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Summarization failed");
    }
    setSummarizing(false);
  }

  async function handlePushToNextMeeting() {
    const itemsToAdd: AgendaItem[] = actionItems.map((a) => ({
      item: `[Action Item] ${a.task}${a.deadline ? ` (due: ${a.deadline})` : ""}`,
      assigned_to: a.assigned_to || null,
      notes: null,
    }));

    if (selectedNextMeeting === "new") {
      // Create new meeting with action items as agenda
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMeetingTitle || "Follow-up Meeting",
          meeting_date: newMeetingDate || null,
          agenda: itemsToAdd,
          raw_text: "",
          participants: [],
          updates: [],
          action_items: [],
          previous_action_items: [],
        }),
      });
      if (res.ok) {
        const { id: newId } = await res.json();
        setShowPushPrompt(false);
        router.push(`/meetings/${newId}`);
      }
    } else {
      // Append to existing meeting's agenda
      const targetRes = await fetch(`/api/minutes/${selectedNextMeeting}`);
      const target = await targetRes.json();
      const existingAgenda = target.agenda || [];
      await fetch(`/api/minutes/${selectedNextMeeting}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenda: [...existingAgenda, ...itemsToAdd] }),
      });
      setShowPushPrompt(false);
      alert(`${itemsToAdd.length} action item(s) pushed to next meeting's agenda`);
    }
  }

  if (!data) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const hasMinutes = data.raw_text && data.raw_text.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <PrintHeader title="Meeting" subtitle={data.title || "Untitled Meeting"} />
      <Link href="/meetings" className="text-sm text-[#1a3a7a] hover:underline mb-4 inline-block print:hidden">&larr; All Meetings</Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{editing ? <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1 text-2xl font-bold w-full" /> : (data.title || "Untitled Meeting")}</h1>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          {!editing && (
            <>
              <PrintButton label="Save PDF" />
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Delete</button>
              {hasMinutes && <button onClick={() => setShowRaw(!showRaw)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">{showRaw ? "Hide Raw" : "Show Raw"}</button>}
            </>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1.5 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f]">Save</button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm font-medium mb-3">Delete this meeting? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm">Yes, Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      {showRaw && <div className="bg-gray-100 rounded-lg p-4 mb-6"><pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">{data.raw_text}</pre></div>}

      {/* Meeting Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Date</label><input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" /></div>
          </div>
        ) : (
          <div className="flex gap-6 text-sm">
            {data.meeting_date && <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDateLong(data.meeting_date)}</span></div>}
            {data.location && <div><span className="text-gray-500">Location:</span> <span className="font-medium">{data.location}</span></div>}
          </div>
        )}
      </div>

      {/* Attendance */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Attendance ({data.participants?.length || 0} present)
          </h2>
          <button onClick={() => setShowAttendance(!showAttendance)} className="text-xs text-[#1a3a7a] hover:underline print:hidden">
            {showAttendance ? "Close" : "Mark Attendance"}
          </button>
        </div>

        {showAttendance && (
          <div className="mb-4 border border-gray-200 rounded-md p-3 print:hidden">
            <p className="text-xs text-gray-500 mb-2">Click to toggle attendance:</p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {allMembers.map((m) => {
                const isPresent = data.participants?.some((p) => p.name === m.full_name);
                return (
                  <button
                    key={m.id}
                    onClick={async () => {
                      let updated;
                      if (isPresent) {
                        updated = (data.participants || []).filter((p) => p.name !== m.full_name);
                      } else {
                        updated = [...(data.participants || []), { name: m.full_name, role: null }];
                      }
                      await fetch(`/api/minutes/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ participants: updated }),
                      });
                      load();
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isPresent
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {isPresent && "✓ "}{m.first_name} {m.last_name}{m.chapter ? ` (${m.chapter})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {data.participants && data.participants.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.participants.map((p, i) => (
              <span key={i} className="bg-blue-50 rounded-full px-3 py-1 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.role && <span className="text-gray-500 ml-1">({p.role})</span>}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-xs">No attendance recorded yet</p>
        )}
      </div>

      {/* Agenda */}
      {((editing ? agenda : data.agenda)?.length > 0 || editing) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Agenda</h2>
            {editing && <button onClick={() => setAgenda([...agenda, { item: "", assigned_to: null, notes: null }])} className="text-xs text-[#1a3a7a] hover:underline">+ Add</button>}
          </div>
          {editing ? (
            agenda.map((a, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-3 mb-2">
                <div className="flex gap-2 items-center mb-2">
                  <button type="button" onClick={() => { const arr = [...agenda]; arr[i] = { ...arr[i], done: !arr[i].done }; setAgenda(arr); }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${a.done ? "bg-green-500 border-green-500 text-white" : "border-[#c9a227]"}`}>
                    {a.done ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <span className="text-[#c9a227] text-xs font-bold">{i + 1}</span>}
                  </button>
                  <input type="text" placeholder="Agenda item" value={a.item} onChange={(e) => { const arr = [...agenda]; arr[i] = { ...arr[i], item: e.target.value }; setAgenda(arr); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                  <select value={a.assigned_to || ""} onChange={(e) => { const arr = [...agenda]; arr[i] = { ...arr[i], assigned_to: e.target.value || null }; setAgenda(arr); }} className="w-full sm:w-40 border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                    <option value="">Assigned to</option>
                    {boardMembers.map((m) => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
                  </select>
                  <button onClick={() => setAgenda(agenda.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">&times;</button>
                </div>
                <div className="ml-8" style={{ width: "calc(100% - 2rem)" }}>
                  <textarea placeholder="Paste raw notes here — then click Summarize, or type organized notes directly" rows={3} value={a.notes || ""} onChange={(e) => { const arr = [...agenda]; arr[i] = { ...arr[i], notes: e.target.value || null }; setAgenda(arr); }} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                  {a.notes && a.notes.trim().length > 20 && (
                    <button type="button" disabled={summarizingIdx === i} onClick={() => summarizeNotes(i, a.notes || "", a.item, "edit")} className="mt-1 text-xs text-[#1a3a7a] hover:underline disabled:opacity-50">
                      {summarizingIdx === i ? "Summarizing..." : "✨ Summarize with AI"}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {data.agenda?.map((a, i) => (
                <div key={i} className={`p-2 rounded-md ${a.done ? "bg-green-50/50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={async () => {
                        const updated = [...(data.agenda || [])];
                        updated[i] = { ...updated[i], done: !updated[i].done };
                        await fetch(`/api/minutes/${id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ agenda: updated }),
                        });
                        load();
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        a.done ? "bg-green-500 border-green-500 text-white" : "border-[#c9a227] hover:bg-[#c9a227]/10"
                      }`}
                    >
                      {a.done ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span className="text-[#c9a227] text-xs font-bold">{i + 1}</span>
                      )}
                    </button>
                    <div className="flex-1">
                      <span className={`text-sm ${a.done ? "line-through text-gray-400" : "text-gray-900"}`}>{a.item}</span>
                      {a.assigned_to && <span className="ml-2 text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{a.assigned_to}</span>}
                      {a.done && <span className="ml-2 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Done</span>}
                    </div>
                  </div>
                  {/* Notes display / inline edit */}
                  {editingNoteIdx === i ? (
                    <div className="ml-9 mt-2">
                      <textarea rows={4} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Paste raw notes here..." className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                      <div className="flex gap-2 mt-1">
                        <button onClick={async () => {
                          const updated = [...(data.agenda || [])];
                          updated[i] = { ...updated[i], notes: noteDraft || null };
                          await fetch(`/api/minutes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agenda: updated }) });
                          setEditingNoteIdx(null); setNoteDraft(""); load();
                        }} className="text-xs text-green-600 hover:underline">Save</button>
                        {noteDraft.trim().length > 20 && (
                          <button disabled={summarizingIdx === i} onClick={() => summarizeNotes(i, noteDraft, a.item, "view")} className="text-xs text-[#1a3a7a] hover:underline disabled:opacity-50">
                            {summarizingIdx === i ? "Summarizing..." : "✨ Summarize & Save"}
                          </button>
                        )}
                        <button onClick={() => { setEditingNoteIdx(null); setNoteDraft(""); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-9 mt-1">
                      {a.notes ? (
                        <div onClick={() => { setEditingNoteIdx(i); setNoteDraft(a.notes || ""); }} className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap cursor-pointer hover:bg-gray-100 transition-colors" title="Click to edit notes">
                          {a.notes}
                        </div>
                      ) : (
                        <button onClick={() => { setEditingNoteIdx(i); setNoteDraft(""); }} className="text-xs text-gray-400 hover:text-[#1a3a7a] hover:underline">
                          + Add notes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Minutes Button / Input */}
      {!hasMinutes && !editing && (
        <div className="mb-6">
          {!showMinutesInput ? (
            <button onClick={() => setShowMinutesInput(true)} className="w-full bg-white rounded-lg shadow p-6 text-center hover:shadow-md transition-shadow border-2 border-dashed border-gray-300 text-gray-500 hover:text-[#1a3a7a] hover:border-[#1a3a7a]">
              + Add Meeting Minutes
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Meeting Minutes</h2>
              <textarea
                rows={12}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your meeting notes, transcript, or minutes here..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a7a]"
              />
              {summarizing && (
                <div className="bg-blue-50 rounded-lg p-3 mt-3 flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-[#1a3a7a]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span className="text-sm text-[#1a3a7a] italic">{loadingPhrase}</span>
                </div>
              )}
              <div className="flex gap-3 mt-3">
                <button onClick={() => setShowMinutesInput(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm">Cancel</button>
                <button onClick={handleSummarize} disabled={summarizing || !rawText.trim()} className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654] disabled:opacity-50">
                  {summarizing ? "Summarizing..." : "Summarize & Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Push Action Items to Next Meeting Modal */}
      {showPushPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Push Action Items to Next Meeting?</h3>
            <p className="text-sm text-gray-500 mb-4">
              {actionItems.length} action item{actionItems.length !== 1 ? "s" : ""} will be added to the next meeting&apos;s agenda.
            </p>

            <div className="space-y-3 mb-4">
              {nextMeetings.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select existing meeting</label>
                  <select value={selectedNextMeeting} onChange={(e) => setSelectedNextMeeting(e.target.value === "new" ? "new" : Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="new">Create new meeting</option>
                    {nextMeetings.map((m) => <option key={m.id} value={m.id}>{m.title || "Untitled"} ({m.meeting_date})</option>)}
                  </select>
                </div>
              )}

              {selectedNextMeeting === "new" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Title</label>
                    <input type="text" value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Follow-up Meeting" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input type="date" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <div className="bg-amber-50 rounded-md p-3 text-xs text-gray-600">
                {actionItems.map((a, i) => (
                  <div key={i} className="mb-1">• {a.task} {a.assigned_to && <span className="text-gray-400">({a.assigned_to})</span>}</div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowPushPrompt(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm">Skip</button>
              <button onClick={handlePushToNextMeeting} className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f]">Push to Next Meeting</button>
            </div>
          </div>
        </div>
      )}

      {/* Participants */}
      {hasMinutes && data.participants?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Participants ({data.participants.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.participants.map((p, i) => (
              <span key={i} className="bg-blue-50 rounded-full px-3 py-1 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.role && <span className="text-gray-500 ml-1">({p.role})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Updates */}
      {hasMinutes && data.updates?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Updates & Discussion</h2>
          {data.updates.map((u, i) => (
            <div key={i} className="border-l-4 border-[#1e3a5f] pl-4 mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">{u.topic}</span>
                {u.by && <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{u.by}</span>}
              </div>
              <p className="text-sm text-gray-600">{u.details}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Items */}
      {hasMinutes && data.action_items?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Action Items</h2>
            <button
              disabled={creatingTasks}
              onClick={async () => {
                setCreatingTasks(true);
                try {
                  // Create a project for this meeting's action items
                  const projRes = await fetch("/api/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: `Action Items: ${data.title || "Meeting"}`,
                      description: `Action items from meeting on ${data.meeting_date || "N/A"}`,
                      date: data.meeting_date || new Date().toISOString().slice(0, 10),
                      type: "project",
                      status: "ongoing",
                    }),
                  });
                  const { id: projectId } = await projRes.json();

                  // Create a task for each action item
                  let created = 0;
                  for (const item of data.action_items) {
                    const res = await fetch(`/api/events/${projectId}/tasks`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: item.task,
                        assignee: item.assigned_to || null,
                        due_date: item.deadline || null,
                        section: "Action Items",
                        priority: "high",
                        status: "todo",
                      }),
                    });
                    if (res.ok) created++;
                  }
                  alert(`Created project with ${created} task(s). Check the Projects page.`);
                } catch {
                  alert("Failed to create tasks");
                }
                setCreatingTasks(false);
              }}
              className="text-xs text-[#1a3a7a] hover:underline disabled:opacity-50 print:hidden"
            >
              {creatingTasks ? "Creating..." : "Create Tasks from Action Items"}
            </button>
          </div>
          <div className="space-y-2">
            {data.action_items.map((a, i) => (
              <div key={i} className="bg-amber-50 rounded-md p-3 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c9a227] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-medium text-sm text-gray-900">{a.task}</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs border border-gray-300 rounded-full px-2 py-0.5 text-gray-600">{a.assigned_to}</span>
                    {a.deadline ? (
                      <span className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5">Due: {a.deadline}</span>
                    ) : (
                      <button
                        className="text-xs text-gray-400 hover:text-[#1a3a7a] hover:underline print:hidden"
                        onClick={async () => {
                          const deadline = prompt("Set due date (YYYY-MM-DD):", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
                          if (deadline) {
                            const updated = [...data.action_items];
                            updated[i] = { ...updated[i], deadline };
                            await fetch(`/api/minutes/${id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action_items: updated }),
                            });
                            load();
                          }
                        }}
                      >
                        + Set due date
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Action Items */}
      {hasMinutes && data.previous_action_items?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Previous Action Items</h2>
          <div className="space-y-2">
            {data.previous_action_items.map((p, i) => (
              <div key={i} className={`rounded-md p-3 flex items-start gap-3 ${p.status === "done" ? "bg-green-50" : "bg-yellow-50"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs mt-0.5 ${p.status === "done" ? "bg-green-500" : "bg-yellow-400"}`}>
                  {p.status === "done" ? "✓" : "!"}
                </span>
                <div className="flex-1">
                  <span className={`text-sm ${p.status === "done" ? "line-through text-gray-400" : "font-medium text-gray-900"}`}>{p.task}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{p.assigned_to}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${p.status === "done" ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"}`}>
                      {p.status === "done" ? "DONE" : "PENDING"}
                    </span>
                    {p.remarks && <span className="text-xs text-gray-400">{p.remarks}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
