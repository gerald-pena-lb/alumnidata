"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AgendaItem { item: string; assigned_to: string | null; }
interface BoardMember { id: number; full_name: string; }

export default function NewMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState<AgendaItem[]>([{ item: "", assigned_to: null }]);
  const [saving, setSaving] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  useEffect(() => {
    fetch("/api/members?role=board_and_admin")
      .then((r) => r.json())
      .then((data) => setBoardMembers(data));
  }, []);

  function addAgendaItem() {
    setAgenda([...agenda, { item: "", assigned_to: null }]);
  }

  function removeAgendaItem(i: number) {
    setAgenda(agenda.filter((_, j) => j !== i));
  }

  function updateAgendaItem(i: number, field: string, value: string) {
    const a = [...agenda];
    a[i] = { ...a[i], [field]: value || null };
    setAgenda(a);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const cleanAgenda = agenda.filter((a) => a.item.trim());
    const res = await fetch("/api/minutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        meeting_date: meetingDate || null,
        location: location || null,
        agenda: cleanAgenda,
        raw_text: "",
        participants: [],
        updates: [],
        action_items: [],
        previous_action_items: [],
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/meetings/${id}`);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Meeting</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meeting Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly General Assembly - April 2026" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Brod Jun's house" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Agenda */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Agenda ({agenda.filter((a) => a.item.trim()).length} items)</h2>
            <button type="button" onClick={addAgendaItem} className="text-xs text-[#1a3a7a] hover:underline">+ Add Item</button>
          </div>
          {agenda.map((a, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <span className="w-6 h-6 rounded-full bg-[#c9a227] text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <input type="text" placeholder="Agenda item" value={a.item} onChange={(e) => updateAgendaItem(i, "item", e.target.value)} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              <select value={a.assigned_to || ""} onChange={(e) => updateAgendaItem(i, "assigned_to", e.target.value)} className="w-full sm:w-40 border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                <option value="">Assigned to</option>
                {boardMembers.map((m) => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
              </select>
              {agenda.length > 1 && (
                <button type="button" onClick={() => removeAgendaItem(i)} className="text-red-400 hover:text-red-600">&times;</button>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f] disabled:opacity-50">
            {saving ? "Saving..." : "Create Meeting"}
          </button>
        </div>
      </form>
    </div>
  );
}
