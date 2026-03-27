"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";

interface Member {
  id: number;
  full_name: string;
  batch_name: string;
  batch_letter: string;
  year: number;
  phone_number: string;
  current_company: string;
  title: string;
  industry: string;
  status: string;
}

export default function BrodsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [batch, setBatch] = useState("");
  const [year, setYear] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (industry) params.set("industry", industry);
    if (batch) params.set("batch", batch);
    if (year) params.set("year", year);
    if (titleFilter) params.set("title", titleFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/members?${params}`);
    setMembers(await res.json());
  }, [search, industry, batch, year, titleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setUploadMsg(`Imported ${data.imported} members`);
      load();
    } else {
      setUploadMsg(`Error: ${data.error}`);
    }
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brods</h1>
        <div className="flex gap-2">
          <label className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
            {uploading ? "Uploading..." : "Upload CSV"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <Link
            href="/brods/new"
            className="px-4 py-2 bg-[#7b1113] text-white rounded-md text-sm hover:bg-[#5a0d0f]"
          >
            Add New Brod
          </Link>
        </div>
      </div>

      {uploadMsg && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
          {uploadMsg}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Batch name/letter..."
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Year..."
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Title..."
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="alive">Alive</option>
            <option value="deceased">Deceased</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <Link href={`/brods/${m.id}`} className="text-[#7b1113] hover:underline font-medium">
                    {m.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {m.batch_name} {m.batch_letter && `(${m.batch_letter})`}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.year}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.current_company}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.title}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.industry}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.status === "alive"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No members found. Add your first brod or upload a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
