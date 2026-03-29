"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalDuesThisYear: number;
  collectionRate: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [membersRes, rateRes] = await Promise.all([
        fetch("/api/members"),
        fetch(`/api/reports?type=collection_rate&year=${new Date().getFullYear()}`),
      ]);
      const members = await membersRes.json();
      const rate = await rateRes.json();

      setStats({
        totalMembers: members.length,
        activeMembers: members.filter((m: { status: string }) => m.status === "active" || m.status === "immortal").length,
        totalDuesThisYear: rate.total_collected,
        collectionRate: rate.collection_rate,
      });
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          UP Alpha Sigma Fraternity
        </h1>
        <p className="text-gray-600 mt-1">Alumni Database & CRM</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Brods" value={stats.totalMembers} />
          <StatCard label="Active Brods" value={stats.activeMembers} />
          <StatCard
            label={`${new Date().getFullYear()} Dues Collected`}
            value={`₱${stats.totalDuesThisYear.toLocaleString()}`}
          />
          <StatCard
            label={`${new Date().getFullYear()} Collection Rate`}
            value={`${stats.collectionRate}%`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/brods" title="Brods" desc="View and manage alumni members" />
        <QuickLink href="/brods/new" title="Add New Brod" desc="Register a new alumni member" />
        <QuickLink href="/events" title="Events" desc="Manage events and meeting minutes" />
        <QuickLink href="/projects" title="Projects" desc="Track ongoing projects" />
        <QuickLink href="/finances" title="Finances" desc="Dues, donations, and expenditures" />
        <QuickLink href="/reports" title="Reports" desc="Financial reports and analytics" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
    >
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{desc}</div>
    </Link>
  );
}
