"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function RafflePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("100");
  const [entries, setEntries] = useState<number[]>([]);
  const [winners, setWinners] = useState<number[]>([]);
  const [currentDraw, setCurrentDraw] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, loading, router]);

  function handleGenerate() {
    const from = parseInt(rangeFrom);
    const to = parseInt(rangeTo);
    if (isNaN(from) || isNaN(to) || from > to || to - from > 9999) return;
    const nums: number[] = [];
    for (let i = from; i <= to; i++) nums.push(i);
    setEntries(nums);
    setWinners([]);
    setCurrentDraw(null);
  }

  function handleDraw() {
    const remaining = entries.filter((n) => !winners.includes(n));
    if (remaining.length === 0 || isDrawing) return;

    setIsDrawing(true);
    let ticks = 0;
    const totalTicks = 20;

    intervalRef.current = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * remaining.length);
      setCurrentDraw(remaining[randomIdx]);
      ticks++;

      if (ticks >= totalTicks) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const winnerIdx = Math.floor(Math.random() * remaining.length);
        const winner = remaining[winnerIdx];
        setCurrentDraw(winner);
        setWinners((prev) => [winner, ...prev]);
        setIsDrawing(false);
      }
    }, 80);
  }

  function handleReset() {
    setWinners([]);
    setCurrentDraw(null);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (!user || user.role !== "admin") return null;

  const remaining = entries.filter((n) => !winners.includes(n));

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Raffle Draw</h1>

      {/* Range Input */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Generate Entries</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="number"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <span className="pb-2 text-gray-400">—</span>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="number"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]"
          >
            Generate
          </button>
        </div>
        {entries.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">{entries.length} entries loaded, {remaining.length} remaining</p>
        )}
      </div>

      {/* Draw Area */}
      {entries.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 text-center">
          <div className={`text-7xl font-bold my-8 tabular-nums transition-all ${isDrawing ? "text-gray-400 scale-110" : currentDraw !== null ? "text-[#1a3a7a]" : "text-gray-300"}`}>
            {currentDraw !== null ? currentDraw : "—"}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleDraw}
              disabled={remaining.length === 0 || isDrawing}
              className="px-8 py-3 bg-[#d4a843] text-white rounded-lg text-lg font-semibold hover:bg-[#b8922e] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDrawing ? "Drawing..." : remaining.length === 0 ? "All Drawn" : "Draw"}
            </button>
            {winners.length > 0 && (
              <button
                onClick={handleReset}
                disabled={isDrawing}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Winners */}
      {winners.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Winners ({winners.length})</h2>
          <div className="space-y-2">
            {winners.map((w, i) => (
              <div key={`${w}-${i}`} className="flex items-center gap-3 bg-gray-50 rounded-md px-4 py-2">
                <span className="text-xs text-gray-400 w-8">#{i + 1}</span>
                <span className="text-lg font-bold text-[#1a3a7a] tabular-nums">{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining Entries */}
      {entries.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Remaining Entries ({remaining.length})</h2>
          <div className="flex flex-wrap gap-1.5">
            {remaining.map((n) => (
              <span key={n} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs tabular-nums">{n}</span>
            ))}
            {remaining.length === 0 && <span className="text-gray-400 text-sm">All entries have been drawn</span>}
          </div>
        </div>
      )}
    </div>
  );
}
