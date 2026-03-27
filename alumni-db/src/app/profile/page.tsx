"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // User management (admin only)
  const [users, setUsers] = useState<{ id: number; username: string; name: string; role: string; created_at: string }[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", name: "", role: "viewer" });

  useEffect(() => {
    if (user) {
      setName(user.name);
      if (user.role === "admin") loadUsers();
    }
  }, [user]);

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setMsg("Profile updated");
      refresh();
    } else {
      const data = await res.json();
      setMsg(data.error || "Update failed");
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPw(true);
    setPwMsg("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg("Password changed successfully");
      setCurrentPw("");
      setNewPw("");
    } else {
      setPwMsg(data.error || "Password change failed");
    }
    setChangingPw(false);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setShowAddUser(false);
      setNewUser({ username: "", password: "", name: "", role: "viewer" });
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to add user");
    }
  }

  async function handleChangeRole(userId: number, role: string) {
    await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  async function handleDeleteUser(userId: number) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    loadUsers();
  }

  const roleLabels: Record<string, string> = { admin: "Admin", board_member: "Board Member", viewer: "Viewer" };
  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    board_member: "bg-blue-100 text-blue-800",
    viewer: "bg-gray-100 text-gray-600",
  };

  if (!user) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#1a3a7a] text-white flex items-center justify-center text-xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">@{user.username}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role]}`}>
              {roleLabels[user.role]}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" required value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" required minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={changingPw} className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08f1f] disabled:opacity-50">
            {changingPw ? "Changing..." : "Change Password"}
          </button>
          {pwMsg && <p className={`text-sm ${pwMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{pwMsg}</p>}
        </form>
      </div>

      {/* User Management (Admin only) */}
      {user.role === "admin" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <button onClick={() => setShowAddUser(!showAddUser)} className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
              Add User
            </button>
          </div>

          {showAddUser && (
            <form onSubmit={handleAddUser} className="bg-gray-50 rounded-md p-4 mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
                <input type="text" required value={newUser.username} onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                <input type="text" required value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" required value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                  <option value="viewer">Viewer</option>
                  <option value="board_member">Board Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-span-2">
                <button type="submit" className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08f1f]">Create User</button>
              </div>
            </form>
          )}

          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Username</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 text-sm">@{u.username}</td>
                  <td className="px-3 py-2 text-sm">{u.name}</td>
                  <td className="px-3 py-2 text-sm">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      disabled={u.id === user.id}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="board_member">Board Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {u.id !== user.id && (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
