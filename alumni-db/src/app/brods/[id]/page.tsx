"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
  dues: { id: number; year: number; amount: number; date_paid: string; remarks: string }[];
  donations: {
    id: number;
    amount: number;
    date_given: string;
    remarks: string;
    transaction_reference: string;
  }[];
}

export default function BrodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [duesForm, setDuesForm] = useState({ year: "", amount: "", date_paid: "", remarks: "" });
  const [donationForm, setDonationForm] = useState({
    amount: "",
    date_given: "",
    remarks: "",
    transaction_reference: "",
  });
  const [showDuesForm, setShowDuesForm] = useState(false);
  const [showDonationForm, setShowDonationForm] = useState(false);

  async function load() {
    const res = await fetch(`/api/members/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMember(data);
    setForm({
      full_name: data.full_name || "",
      batch_name: data.batch_name || "",
      batch_letter: data.batch_letter || "",
      year: data.year?.toString() || "",
      phone_number: data.phone_number || "",
      current_company: data.current_company || "",
      title: data.title || "",
      industry: data.industry || "",
      status: data.status || "alive",
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    await fetch(`/api/members/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : null }),
    });
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this member?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    router.push("/brods");
  }

  async function handleAddDues(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: Number(id),
        year: Number(duesForm.year),
        amount: Number(duesForm.amount),
        date_paid: duesForm.date_paid,
        remarks: duesForm.remarks,
      }),
    });
    if (res.ok) {
      setShowDuesForm(false);
      setDuesForm({ year: "", amount: "", date_paid: "", remarks: "" });
      load();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  }

  async function handleAddDonation(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: Number(id),
        amount: Number(donationForm.amount),
        date_given: donationForm.date_given,
        remarks: donationForm.remarks,
        transaction_reference: donationForm.transaction_reference,
      }),
    });
    setShowDonationForm(false);
    setDonationForm({ amount: "", date_given: "", remarks: "", transaction_reference: "" });
    load();
  }

  if (!member) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{member.full_name}</h1>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              member.status === "alive" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {member.status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Member Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["full_name", "Full Name"],
                ["batch_name", "Batch Name"],
                ["batch_letter", "Batch Letter"],
                ["year", "Year"],
                ["phone_number", "Phone Number"],
                ["current_company", "Company"],
                ["title", "Title"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={key === "year" ? "number" : "text"}
                    value={form[key] || ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  value={form.industry || ""}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status || "alive"}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="alive">Alive</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Info label="Batch" value={`${member.batch_name || ""} ${member.batch_letter ? `(${member.batch_letter})` : ""}`} />
            <Info label="Year" value={member.year?.toString()} />
            <Info label="Phone" value={member.phone_number} />
            <Info label="Company" value={member.current_company} />
            <Info label="Title" value={member.title} />
            <Info label="Industry" value={member.industry} />
          </div>
        )}
      </div>

      {/* Annual Dues */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Annual Dues</h2>
          <button
            onClick={() => setShowDuesForm(!showDuesForm)}
            className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]"
          >
            Record Payment
          </button>
        </div>

        {showDuesForm && (
          <form onSubmit={handleAddDues} className="bg-gray-50 rounded-md p-4 mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
              <input
                type="number"
                required
                value={duesForm.year}
                onChange={(e) => setDuesForm((f) => ({ ...f, year: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={duesForm.amount}
                onChange={(e) => setDuesForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date Paid *</label>
              <input
                type="date"
                required
                value={duesForm.date_paid}
                onChange={(e) => setDuesForm((f) => ({ ...f, date_paid: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input
                type="text"
                value={duesForm.remarks}
                onChange={(e) => setDuesForm((f) => ({ ...f, remarks: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
                Save
              </button>
            </div>
          </form>
        )}

        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Year</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date Paid</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {member.dues.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 text-sm">{d.year}</td>
                <td className="px-3 py-2 text-sm">₱{d.amount.toLocaleString()}</td>
                <td className="px-3 py-2 text-sm">{d.date_paid}</td>
                <td className="px-3 py-2 text-sm text-gray-500">{d.remarks}</td>
              </tr>
            ))}
            {member.dues.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-sm">
                  No dues recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Donations */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Donations</h2>
          <button
            onClick={() => setShowDonationForm(!showDonationForm)}
            className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]"
          >
            Record Donation
          </button>
        </div>

        {showDonationForm && (
          <form onSubmit={handleAddDonation} className="bg-gray-50 rounded-md p-4 mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={donationForm.amount}
                onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date Given *</label>
              <input
                type="date"
                required
                value={donationForm.date_given}
                onChange={(e) => setDonationForm((f) => ({ ...f, date_given: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Reference</label>
              <input
                type="text"
                value={donationForm.transaction_reference}
                onChange={(e) => setDonationForm((f) => ({ ...f, transaction_reference: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input
                type="text"
                value={donationForm.remarks}
                onChange={(e) => setDonationForm((f) => ({ ...f, remarks: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
                Save
              </button>
            </div>
          </form>
        )}

        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reference</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {member.donations.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 text-sm">{d.date_given}</td>
                <td className="px-3 py-2 text-sm">₱{d.amount.toLocaleString()}</td>
                <td className="px-3 py-2 text-sm">{d.transaction_reference}</td>
                <td className="px-3 py-2 text-sm text-gray-500">{d.remarks}</td>
              </tr>
            ))}
            {member.donations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-sm">
                  No donations recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}
