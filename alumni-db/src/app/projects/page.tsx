"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
  status: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/events?type=project").then((r) => r.json()).then(setProjects);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Link
          href="/events/new?type=project"
          className="px-4 py-2 bg-[#7b1113] text-white rounded-md text-sm hover:bg-[#5a0d0f]"
        >
          New Project
        </Link>
      </div>

      <div className="grid gap-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/events/${p.id}`}
            className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{p.name}</div>
                <div className="text-sm text-gray-500 mt-1">{p.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{p.date}</div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.status === "upcoming"
                      ? "bg-blue-100 text-blue-800"
                      : p.status === "ongoing"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500">No projects yet.</div>
        )}
      </div>
    </div>
  );
}
