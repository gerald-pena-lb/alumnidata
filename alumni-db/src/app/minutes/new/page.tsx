"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Participant { name: string; role: string | null; }
interface Update { topic: string; details: string; by: string | null; }
interface ActionItem { task: string; assigned_to: string; deadline: string | null; }
interface PrevActionItem { task: string; assigned_to: string; status: "done" | "pending"; remarks: string | null; }

const LOADING_PHRASES = [
  "Binabasa ko yung minutes, brod...",
  "Teka lang, sine-summarize ko pa...",
  "Sinusuri ko yung notes mo, brod...",
  "Hintay lang, ini-identify ko pa yung action items...",
];

const PLACEHOLDER = `Paste your meeting notes, transcript, or minutes here...

e.g. Meeting last March 15, 2026 at Brod Jun's house.
Present: Brod Gerald, Brod Jun, Brod Mark, Brod Rico

Updates:
- Gerald reported that the alumni database is now live
- Jun mentioned the upcoming reunion on April

Action items:
- Gerald will add the minutes feature by next week
- Jun to confirm the venue for April reunion
- Mark to collect dues from batch Delta`;

export default function NewMinutesPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [hasSummarized, setHasSummarized] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [saving, setSaving] = useState(false);
  const phraseRef = useRef<NodeJS.Timeout | null>(null);

  // Summary fields
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [prevItems, setPrevItems] = useState<PrevActionItem[]>([]);

  useEffect(() => {
    if (summarizing) {
      let idx = 0;
      setLoadingPhrase(LOADING_PHRASES[0]);
      phraseRef.current = setInterval(() => {
        idx = (idx + 1) % LOADING_PHRASES.length;
        setLoadingPhrase(LOADING_PHRASES[idx]);
      }, 3000);
    } else if (phraseRef.current) {
      clearInterval(phraseRef.current);
    }
    return () => { if (phraseRef.current) clearInterval(phraseRef.current); };
  }, [summarizing]);

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
      const data = await res.json();
      setTitle(data.title || "");
      setMeetingDate(data.meeting_date || "");
      setLocation(data.location || "");
      setParticipants(data.participants || []);
      setUpdates(data.updates || []);
      setActionItems(data.action_items || []);
      setPrevItems(data.previous_action_items || []);
      setHasSummarized(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Summarization failed");
    }
    setSummarizing(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/minutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw_text: rawText,
        title,
        meeting_date: meetingDate || null,
        location: location || null,
        participants,
        updates,
        action_items: actionItems,
        previous_action_items: prevItems,
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/minutes/${id}`);
    }
    setSaving(false);
  }

  function discard() {
    setHasSummarized(false);
    setTitle(""); setMeetingDate(""); setLocation("");
    setParticipants([]); setUpdates([]); setActionItems([]); setPrevItems([]);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Meeting Minutes</h1>

      {/* Step 1: Raw Text */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Raw Meeting Notes</label>
        <textarea
          rows={12}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={PLACEHOLDER}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a7a] focus:border-transparent font-mono"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSummarize}
            disabled={summarizing || !rawText.trim()}
            className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm font-medium hover:bg-[#0f2654] disabled:opacity-50"
          >
            {hasSummarized ? "Re-summarize" : "Summarize with AI"}
          </button>
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </div>

      {/* Loading */}
      {summarizing && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#1a3a7a]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-[#1a3a7a] italic">{loadingPhrase}</span>
        </div>
      )}

      {/* Step 2: Editable Summary */}
      {hasSummarized && !summarizing && (
        <div className="space-y-6">
          {/* Title / Date / Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Date</label>
                <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Participants ({participants.length})</h3>
              <button onClick={() => setParticipants([...participants, { name: "", role: null }])} className="text-xs text-[#1a3a7a] hover:underline">+ Add</button>
            </div>
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input type="text" placeholder="Name" value={p.name} onChange={(e) => { const a = [...participants]; a[i] = { ...a[i], name: e.target.value }; setParticipants(a); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Role (optional)" value={p.role || ""} onChange={(e) => { const a = [...participants]; a[i] = { ...a[i], role: e.target.value || null }; setParticipants(a); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <button onClick={() => setParticipants(participants.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
              </div>
            ))}
          </div>

          {/* Updates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Updates & Discussion</h3>
              <button onClick={() => setUpdates([...updates, { topic: "", details: "", by: null }])} className="text-xs text-[#1a3a7a] hover:underline">+ Add</button>
            </div>
            {updates.map((u, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-3 mb-3">
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="Topic" value={u.topic} onChange={(e) => { const a = [...updates]; a[i] = { ...a[i], topic: e.target.value }; setUpdates(a); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                  <input type="text" placeholder="Reported by" value={u.by || ""} onChange={(e) => { const a = [...updates]; a[i] = { ...a[i], by: e.target.value || null }; setUpdates(a); }} className="w-40 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                  <button onClick={() => setUpdates(updates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
                </div>
                <textarea placeholder="Details" rows={2} value={u.details} onChange={(e) => { const a = [...updates]; a[i] = { ...a[i], details: e.target.value }; setUpdates(a); }} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Action Items</h3>
              <button onClick={() => setActionItems([...actionItems, { task: "", assigned_to: "", deadline: null }])} className="text-xs text-[#1a3a7a] hover:underline">+ Add</button>
            </div>
            {actionItems.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="w-6 h-6 rounded-full bg-[#c9a227] text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <input type="text" placeholder="Task" value={a.task} onChange={(e) => { const arr = [...actionItems]; arr[i] = { ...arr[i], task: e.target.value }; setActionItems(arr); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Assigned to" value={a.assigned_to} onChange={(e) => { const arr = [...actionItems]; arr[i] = { ...arr[i], assigned_to: e.target.value }; setActionItems(arr); }} className="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Deadline" value={a.deadline || ""} onChange={(e) => { const arr = [...actionItems]; arr[i] = { ...arr[i], deadline: e.target.value || null }; setActionItems(arr); }} className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <button onClick={() => setActionItems(actionItems.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
              </div>
            ))}
          </div>

          {/* Previous Action Items */}
          {prevItems.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Previous Action Items</h3>
              {prevItems.map((p, i) => (
                <div key={i} className={`flex gap-2 mb-2 items-center p-2 rounded-md ${p.status === "done" ? "bg-green-50" : "bg-yellow-50"}`}>
                  <button
                    onClick={() => { const a = [...prevItems]; a[i] = { ...a[i], status: a[i].status === "done" ? "pending" : "done" }; setPrevItems(a); }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${p.status === "done" ? "bg-green-500 text-white" : "bg-yellow-400 text-white"}`}
                  >
                    {p.status === "done" ? "✓" : "!"}
                  </button>
                  <span className={`flex-1 text-sm ${p.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {p.task} <span className="text-gray-400">— {p.assigned_to}</span>
                  </span>
                  {p.remarks && <span className="text-xs text-gray-400">{p.remarks}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Save / Discard */}
          <div className="flex gap-3">
            <button onClick={discard} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">
              Discard Summary
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Minutes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
