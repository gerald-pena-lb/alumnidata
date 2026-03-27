"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="https://lh5.googleusercontent.com/c6Ov7jziQCkrqNvyY9IYtOXNTqlQUgg9aHLcxhR0Ep_8IQ_iXIpUfdGHsNktsfSR79lsQxehYmwblgByxfGeyxKzW2WnsvCnVKX76rRIxDcGH0ar8idRRyuK_CuGweGFRFrG0KNAVVlztW1z6Q"
            alt="UP Alpha Sigma Fraternity"
            className="mx-auto h-32 w-auto"
          />
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a7a] focus:border-transparent"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a7a] focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#d4a843] text-white rounded-md text-sm font-medium hover:bg-[#b8922e] disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Contact admin for credentials
          </p>
        </form>
      </div>
    </div>
  );
}
