"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Meeting {
  id: number;
  title: string;
  meeting_date: string;
  location: string;
  participants: { name: string; role: string | null }[];
  agenda: { item: string; assigned_to: string | null }[];
  created_at: string;
}

function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/minutes${params}`);
    if (res.ok) setMeetings(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage agendas, minutes, and action items</p>
        </div>
        <Link href="/meetings/new" className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f]">
          + New Meeting
        </Link>
      </div>

      <div className="mt-4 mb-6">
        <input
          type="text"
          placeholder="Search by title or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a7a] focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 font-medium">No meetings yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Create a meeting to set the agenda</p>
          <Link href="/meetings/new" className="inline-block px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f]">
            Create First Meeting
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {meetings.map((m) => (
            <Link key={m.id} href={`/meetings/${m.id}`} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{m.title || "Untitled Meeting"}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                    {m.meeting_date && <span>{formatDate(m.meeting_date)}</span>}
                    {m.location && <span>• {m.location}</span>}
                    <span>• {m.participants?.length || 0} participant{(m.participants?.length || 0) !== 1 ? "s" : ""}</span>
                    {m.agenda?.length > 0 && <span>• {m.agenda.length} agenda item{m.agenda.length !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
