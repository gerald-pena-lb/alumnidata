"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Participant { name: string; role: string | null; }
interface Update { topic: string; details: string; by: string | null; }
interface ActionItem { task: string; assigned_to: string; deadline: string | null; }
interface PrevActionItem { task: string; assigned_to: string; status: "done" | "pending"; remarks: string | null; }

interface Minutes {
  id: number;
  raw_text: string;
  title: string;
  meeting_date: string;
  location: string;
  participants: Participant[];
  updates: Update[];
  action_items: ActionItem[];
  previous_action_items: PrevActionItem[];
  created_at: string;
}

function formatDateLong(d: string): string {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function MinuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Minutes | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [prevItems, setPrevItems] = useState<PrevActionItem[]>([]);

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
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    await fetch(`/api/minutes/${id}`, { method: "DELETE" });
    router.push("/minutes");
  }

  async function handleSave() {
    await fetch(`/api/minutes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meeting_date: meetingDate || null, location: location || null, participants, updates, action_items: actionItems, previous_action_items: prevItems }),
    });
    setEditing(false);
    load();
  }

  if (!data) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/minutes" className="text-sm text-[#1a3a7a] hover:underline mb-4 inline-block">&larr; All Minutes</Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{editing ? <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1 text-2xl font-bold w-full" /> : (data.title || "Untitled Meeting")}</h1>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Delete</button>
              <button onClick={() => setShowRaw(!showRaw)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                {showRaw ? "Hide Raw" : "Show Raw"}
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">Cancel</button>
              <button onClick={handleSave} className="px-3 py-1.5 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f]">Save</button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm font-medium mb-3">Are you sure you want to delete these minutes? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Yes, Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Raw Text */}
      {showRaw && (
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">{data.raw_text}</pre>
        </div>
      )}

      {/* Meeting Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
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

      {/* Participants */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Participants ({(editing ? participants : data.participants)?.length || 0})</h2>
        {editing ? (
          <div>
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input type="text" placeholder="Name" value={p.name} onChange={(e) => { const a = [...participants]; a[i] = { ...a[i], name: e.target.value }; setParticipants(a); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Role" value={p.role || ""} onChange={(e) => { const a = [...participants]; a[i] = { ...a[i], role: e.target.value || null }; setParticipants(a); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <button onClick={() => setParticipants(participants.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">&times;</button>
              </div>
            ))}
            <button onClick={() => setParticipants([...participants, { name: "", role: null }])} className="text-xs text-[#1a3a7a] hover:underline mt-1">+ Add Participant</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.participants?.map((p, i) => (
              <span key={i} className="bg-blue-50 rounded-full px-3 py-1 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.role && <span className="text-gray-500 ml-1">({p.role})</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Updates & Discussion */}
      {((editing ? updates : data.updates)?.length > 0 || editing) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Updates & Discussion</h2>
            {editing && <button onClick={() => setUpdates([...updates, { topic: "", details: "", by: null }])} className="text-xs text-[#1a3a7a] hover:underline">+ Add</button>}
          </div>
          {editing ? (
            updates.map((u, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-3 mb-3">
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="Topic" value={u.topic} onChange={(e) => { const a = [...updates]; a[i] = { ...a[i], topic: e.target.value }; setUpdates(a); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                  <input type="text" placeholder="By" value={u.by || ""} onChange={(e) => { const a = [...updates]; a[i] = { ...a[i], by: e.target.value || null }; setUpdates(a); }} className="w-36 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                  <button onClick={() => setUpdates(updates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">&times;</button>
                </div>
                <textarea placeholder="Details" rows={2} value={u.details} onChange={(e) => { const a = [...updates]; a[i] = { ...a[i], details: e.target.value }; setUpdates(a); }} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              </div>
            ))
          ) : (
            data.updates?.map((u, i) => (
              <div key={i} className="border-l-4 border-[#1e3a5f] pl-4 mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{u.topic}</span>
                  {u.by && <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{u.by}</span>}
                </div>
                <p className="text-sm text-gray-600">{u.details}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Action Items */}
      {((editing ? actionItems : data.action_items)?.length > 0 || editing) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Action Items</h2>
            {editing && <button onClick={() => setActionItems([...actionItems, { task: "", assigned_to: "", deadline: null }])} className="text-xs text-[#1a3a7a] hover:underline">+ Add</button>}
          </div>
          {editing ? (
            actionItems.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <span className="w-6 h-6 rounded-full bg-[#c9a227] text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <input type="text" placeholder="Task" value={a.task} onChange={(e) => { const arr = [...actionItems]; arr[i] = { ...arr[i], task: e.target.value }; setActionItems(arr); }} className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Assigned to" value={a.assigned_to} onChange={(e) => { const arr = [...actionItems]; arr[i] = { ...arr[i], assigned_to: e.target.value }; setActionItems(arr); }} className="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Deadline" value={a.deadline || ""} onChange={(e) => { const arr = [...actionItems]; arr[i] = { ...arr[i], deadline: e.target.value || null }; setActionItems(arr); }} className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
                <button onClick={() => setActionItems(actionItems.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">&times;</button>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {data.action_items?.map((a, i) => (
                <div key={i} className="bg-amber-50 rounded-md p-3 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#c9a227] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm text-gray-900">{a.task}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs border border-gray-300 rounded-full px-2 py-0.5 text-gray-600">{a.assigned_to}</span>
                      {a.deadline && <span className="text-xs text-gray-400">{a.deadline}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Previous Action Items */}
      {((editing ? prevItems : data.previous_action_items)?.length > 0) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Previous Action Items</h2>
          {editing ? (
            prevItems.map((p, i) => (
              <div key={i} className={`flex gap-2 mb-2 items-center p-2 rounded-md ${p.status === "done" ? "bg-green-50" : "bg-yellow-50"}`}>
                <button
                  onClick={() => { const a = [...prevItems]; a[i] = { ...a[i], status: a[i].status === "done" ? "pending" : "done" }; setPrevItems(a); }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs ${p.status === "done" ? "bg-green-500" : "bg-yellow-400"}`}
                >{p.status === "done" ? "✓" : "!"}</button>
                <span className={`flex-1 text-sm ${p.status === "done" ? "line-through text-gray-400" : ""}`}>{p.task}</span>
                <span className="text-xs text-gray-400">{p.assigned_to}</span>
                <input type="text" placeholder="Remarks" value={p.remarks || ""} onChange={(e) => { const a = [...prevItems]; a[i] = { ...a[i], remarks: e.target.value || null }; setPrevItems(a); }} className="w-40 border border-gray-300 rounded-md px-2 py-1 text-xs" />
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {data.previous_action_items?.map((p, i) => (
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
          )}
        </div>
      )}
    </div>
  );
}
