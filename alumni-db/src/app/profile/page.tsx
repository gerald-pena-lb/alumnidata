"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { INDUSTRIES } from "@/lib/industries";

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-blue-100 text-blue-800" },
  { value: "inactive", label: "Inactive", color: "bg-red-100 text-red-800" },
  { value: "immortal", label: "Immortal", color: "bg-[#c9a227]/20 text-[#c9a227]" },
];

const CHAPTERS = ["Diliman", "Los Banos", "Manila"];

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    first_name: "", last_name: "", chapter: "", batch_name: "", batch_letter: "", year: "",
    phone_number: "", current_company: "", title: "", industry: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Admin: member management
  const [members, setMembers] = useState<{
    id: number; username: string; full_name: string; name: string;
    role: string; chapter: string; status: string;
    active_start_date: string | null; active_end_date: string | null;
  }[]>([]);
  const [resetPwId, setResetPwId] = useState<number | null>(null);
  const [resetPwValue, setResetPwValue] = useState("masig123");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        chapter: user.chapter || "",
        batch_name: user.batch_name || "",
        batch_letter: user.batch_letter || "",
        year: user.year?.toString() || "",
        phone_number: user.phone_number || "",
        current_company: user.current_company || "",
        title: user.title || "",
        industry: user.industry || "",
      });
      if (user.role === "admin") loadMembers();
    }
  }, [user]);

  async function loadMembers() {
    const res = await fetch("/api/users");
    if (res.ok) setMembers(await res.json());
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    const res = await fetch("/api/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : null }),
    });
    if (res.ok) { setMsg("Profile updated"); refresh(); }
    else { const d = await res.json(); setMsg(d.error || "Update failed"); }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPw(true); setPwMsg("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    const d = await res.json();
    if (res.ok) { setPwMsg("Password changed successfully"); setCurrentPw(""); setNewPw(""); }
    else { setPwMsg(d.error || "Failed"); }
    setChangingPw(false);
  }

  async function updateMember(memberId: number, updates: Record<string, unknown>) {
    await fetch(`/api/users/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    loadMembers();
  }

  async function handleResetPassword(memberId: number) {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, new_password: resetPwValue }),
    });
    if (res.ok) { setResetPwId(null); setResetPwValue("masig123"); alert("Password reset successfully"); }
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  const roleLabels: Record<string, string> = { admin: "Admin", board_member: "Board Member", brod: "Brod" };
  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    board_member: "bg-blue-100 text-blue-800",
    brod: "bg-gray-100 text-gray-600",
  };

  const statusColor = STATUS_OPTIONS.find((s) => s.value === (user?.status || "active"))?.color || "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === (user?.status || "active"))?.label || user?.status;

  if (!user) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#1a3a7a] text-white flex items-center justify-center text-xl font-bold">
            {(user.first_name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
            <div className="text-sm text-gray-500">@{user.username}</div>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role]}`}>{roleLabels[user.role]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
              <select value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select Chapter</option>
                {CHAPTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
              <input type="text" value={form.batch_name} onChange={(e) => setForm((f) => ({ ...f, batch_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Letter</label>
              <input type="text" value={form.batch_letter} onChange={(e) => setForm((f) => ({ ...f, batch_letter: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input type="text" value={form.current_company} onChange={(e) => setForm((f) => ({ ...f, current_company: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select Industry</option>
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654] disabled:opacity-50">
            {saving ? "Saving..." : "Update Profile"}
          </button>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" required value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" required minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={changingPw} className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08f1f] disabled:opacity-50">
            {changingPw ? "Changing..." : "Change Password"}
          </button>
          {pwMsg && <p className={`text-sm ${pwMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{pwMsg}</p>}
        </form>
      </div>

      {/* Member Management (Admin only) */}
      {user.role === "admin" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Management</h2>
          <div className="space-y-2">
            {members.map((m) => {
              const mStatus = STATUS_OPTIONS.find((s) => s.value === m.status);
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Summary row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{m.full_name}</span>
                      <span className="text-xs text-gray-400 ml-2">@{m.username}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mStatus?.color || "bg-gray-100 text-gray-600"}`}>
                      {mStatus?.label || m.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[m.role] || "bg-gray-100"}`}>
                      {roleLabels[m.role] || m.role}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Status */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                          <select
                            value={m.status}
                            onChange={(e) => updateMember(m.id, { status: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>

                        {/* Role */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                          <select
                            value={m.role}
                            onChange={(e) => updateMember(m.id, { role: e.target.value })}
                            disabled={m.id === user.id}
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
                          >
                            <option value="brod">Brod</option>
                            <option value="board_member">Board Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        {/* Chapter */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Chapter</label>
                          <span className="text-sm text-gray-700">{m.chapter || "—"}</span>
                        </div>
                      </div>

                      {/* Active Duration */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Active Membership Period</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-0.5">Start Date</label>
                            <input
                              type="date"
                              value={m.active_start_date || ""}
                              onChange={(e) => updateMember(m.id, { active_start_date: e.target.value || null })}
                              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-0.5">End Date</label>
                            <input
                              type="date"
                              value={m.active_end_date || ""}
                              onChange={(e) => updateMember(m.id, { active_end_date: e.target.value || null })}
                              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                        {m.active_start_date && m.active_end_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Duration: {Math.ceil((new Date(m.active_end_date).getTime() - new Date(m.active_start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-1">
                        {resetPwId === m.id ? (
                          <div className="flex gap-2 items-center">
                            <input type="text" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs w-28" placeholder="New password" />
                            <button onClick={() => handleResetPassword(m.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                            <button onClick={() => setResetPwId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setResetPwId(m.id); setResetPwValue("masig123"); }} className="text-xs text-[#1a3a7a] hover:underline">
                            Reset Password
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
