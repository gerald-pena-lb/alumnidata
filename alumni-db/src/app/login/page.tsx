"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHAPTERS = ["Diliman", "Los Banos", "Manila"];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regForm, setRegForm] = useState({
    first_name: "", last_name: "", username: "", password: "", confirm_password: "",
    chapter: "", batch_name: "", batch_letter: "", year: "",
    phone_number: "", current_company: "", title: "",
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (regForm.password !== regForm.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (regForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!regForm.first_name.trim() || !regForm.last_name.trim()) {
      setError("First name and last name are required");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regForm),
    });

    if (res.ok) {
      setSuccess("Account created! Your account is inactive until approved by an admin. You can now sign in.");
      setMode("login");
      setUsername(regForm.username);
      setPassword("");
      setRegForm({ first_name: "", last_name: "", username: "", password: "", confirm_password: "", chapter: "", batch_name: "", batch_letter: "", year: "", phone_number: "", current_company: "", title: "" });
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img
            src="https://lh5.googleusercontent.com/c6Ov7jziQCkrqNvyY9IYtOXNTqlQUgg9aHLcxhR0Ep_8IQ_iXIpUfdGHsNktsfSR79lsQxehYmwblgByxfGeyxKzW2WnsvCnVKX76rRIxDcGH0ar8idRRyuK_CuGweGFRFrG0KNAVVlztW1z6Q"
            alt="UP Alpha Sigma Fraternity"
            className="mx-auto h-28 w-auto"
          />
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="bg-white shadow-lg rounded-lg p-8 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 text-center">Sign In</h2>

            {error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-md p-3">{success}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a7a] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a7a] focus:border-transparent" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#d4a843] text-white rounded-md text-sm font-medium hover:bg-[#b8922e] disabled:opacity-50 transition-colors">
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-xs text-center text-gray-500">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => { setMode("register"); setError(""); setSuccess(""); }} className="text-[#1a3a7a] font-medium hover:underline">
                Create Account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="bg-white shadow-lg rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 text-center">Create Account</h2>

            {error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" required value={regForm.first_name} onChange={(e) => setRegForm((f) => ({ ...f, first_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" required value={regForm.last_name} onChange={(e) => setRegForm((f) => ({ ...f, last_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
              <input type="text" required value={regForm.username} onChange={(e) => setRegForm((f) => ({ ...f, username: e.target.value }))} placeholder="Choose a username" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" required value={regForm.password} onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input type="password" required value={regForm.confirm_password} onChange={(e) => setRegForm((f) => ({ ...f, confirm_password: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chapter</label>
                <select value={regForm.chapter} onChange={(e) => setRegForm((f) => ({ ...f, chapter: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Select Chapter</option>
                  {CHAPTERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <input type="number" value={regForm.year} onChange={(e) => setRegForm((f) => ({ ...f, year: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Name</label>
                <input type="text" value={regForm.batch_name} onChange={(e) => setRegForm((f) => ({ ...f, batch_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Letter</label>
                <input type="text" value={regForm.batch_letter} onChange={(e) => setRegForm((f) => ({ ...f, batch_letter: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" value={regForm.phone_number} onChange={(e) => setRegForm((f) => ({ ...f, phone_number: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#1a3a7a] text-white rounded-md text-sm font-medium hover:bg-[#0f2654] disabled:opacity-50 transition-colors">
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="text-xs text-center text-gray-500">
              Already have an account?{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-[#1a3a7a] font-medium hover:underline">
                Sign In
              </button>
            </p>

            <p className="text-xs text-gray-400 text-center">
              New accounts are set to inactive until approved by an admin.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
