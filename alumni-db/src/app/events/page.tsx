"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
  status: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const { can } = useAuth();

  useEffect(() => {
    fetch("/api/events?type=event").then((r) => r.json()).then(setEvents);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        {can("add_events") && (
          <Link
            href="/events/new?type=event"
            className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]"
          >
            New Event
          </Link>
        )}
      </div>

      <div className="grid gap-4">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{ev.name}</div>
                <div className="text-sm text-gray-500 mt-1">{ev.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{ev.date}</div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ev.status === "upcoming"
                      ? "bg-blue-100 text-blue-800"
                      : ev.status === "ongoing"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {ev.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">No events yet.</div>
        )}
      </div>
    </div>
  );
}
