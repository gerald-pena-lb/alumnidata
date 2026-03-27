"use client";

import { useEffect, useState } from "react";

interface DuesEntry {
  id: number;
  member_id: number;
  full_name: string;
  year: number;
  amount: number;
  date_paid: string;
  remarks: string;
}

interface DonationEntry {
  id: number;
  member_id: number;
  full_name: string;
  amount: number;
  date_given: string;
  remarks: string;
  transaction_reference: string;
}

interface Expenditure {
  id: number;
  description: string;
  amount: number;
  date: string;
  event_id: number;
  event_name: string;
  remarks: string;
}

interface EventOption {
  id: number;
  name: string;
}

export default function FinancesPage() {
  const [tab, setTab] = useState<"dues" | "donations" | "expenditures">("dues");
  const [dues, setDues] = useState<DuesEntry[]>([]);
  const [donations, setDonations] = useState<DonationEntry[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [duesYear, setDuesYear] = useState(new Date().getFullYear().toString());
  const [showExpForm, setShowExpForm] = useState(false);
  const [expForm, setExpForm] = useState({ description: "", amount: "", date: "", event_id: "", remarks: "" });

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then(setEvents);
  }, []);

  useEffect(() => {
    if (tab === "dues") {
      fetch(`/api/dues?year=${duesYear}`).then((r) => r.json()).then(setDues);
    } else if (tab === "donations") {
      fetch("/api/donations").then((r) => r.json()).then(setDonations);
    } else {
      fetch("/api/expenditures").then((r) => r.json()).then(setExpenditures);
    }
  }, [tab, duesYear]);

  async function handleAddExpenditure(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/expenditures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expForm.description,
        amount: Number(expForm.amount),
        date: expForm.date,
        event_id: expForm.event_id ? Number(expForm.event_id) : null,
        remarks: expForm.remarks,
      }),
    });
    setShowExpForm(false);
    setExpForm({ description: "", amount: "", date: "", event_id: "", remarks: "" });
    fetch("/api/expenditures").then((r) => r.json()).then(setExpenditures);
  }

  const tabs = [
    { key: "dues" as const, label: "Annual Dues" },
    { key: "donations" as const, label: "Donations" },
    { key: "expenditures" as const, label: "Expenditures" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Finances</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dues" && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-gray-600">Year:</label>
            <input
              type="number"
              value={duesYear}
              onChange={(e) => setDuesYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24"
            />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dues.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 text-sm font-medium">{d.full_name}</td>
                    <td className="px-4 py-3 text-sm">{d.year}</td>
                    <td className="px-4 py-3 text-sm">₱{d.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{d.date_paid}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.remarks}</td>
                  </tr>
                ))}
                {dues.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No dues for {duesYear}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "donations" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-sm font-medium">{d.full_name}</td>
                  <td className="px-4 py-3 text-sm">₱{d.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{d.date_given}</td>
                  <td className="px-4 py-3 text-sm">{d.transaction_reference}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.remarks}</td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No donations recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "expenditures" && (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setShowExpForm(!showExpForm)}
              className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]"
            >
              Add Expenditure
            </button>
          </div>

          {showExpForm && (
            <form onSubmit={handleAddExpenditure} className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input
                  type="text" required
                  value={expForm.description}
                  onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                <input
                  type="number" step="0.01" required
                  value={expForm.amount}
                  onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input
                  type="date" required
                  value={expForm.date}
                  onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Event/Project</label>
                <select
                  value={expForm.event_id}
                  onChange={(e) => setExpForm((f) => ({ ...f, event_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <input
                  type="text"
                  value={expForm.remarks}
                  onChange={(e) => setExpForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">Save</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event/Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenditures.map((exp) => (
                  <tr key={exp.id}>
                    <td className="px-4 py-3 text-sm">{exp.date}</td>
                    <td className="px-4 py-3 text-sm">{exp.description}</td>
                    <td className="px-4 py-3 text-sm">₱{exp.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{exp.event_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{exp.remarks}</td>
                  </tr>
                ))}
                {expenditures.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No expenditures recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
