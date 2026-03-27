"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

/* ─── Types ─── */
interface Call {
  id: string;
  date: string;
  fileName: string;
  transcript: string;
  analysis: AnalysisResult | null;
  outcome: string;
}

interface Agent {
  id: string;
  name: string;
  calls: Call[];
  createdAt: string;
}

interface AppData {
  agents: Agent[];
}

interface AnalysisCategory {
  name: string;
  score: number;
  maxScore: number;
  assessment: string;
}

interface Excerpt {
  type: string;
  label: string;
  quote: string;
  rewrite: string;
  nepqPrinciple: string;
  explanation: string;
}

interface Strength {
  quote: string;
  explanation: string;
}

interface AnalysisResult {
  overallScore: number;
  maxScore: number;
  summary: string;
  categories: AnalysisCategory[];
  excerpts: Excerpt[];
  strengths: Strength[];
  coaching: string;
}

/* ─── Constants ─── */
const STORAGE_KEY = "sales_coaching_v2";
const COLORS = {
  primary: "#4f46e5",
  primaryLight: "#e0e7ff",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  yellow: "#d97706",
  yellowLight: "#fef3c7",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  bg: "#f3f4f6",
  white: "#ffffff",
  border: "#e5e7eb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
};

const OUTCOMES = [
  { key: "booked", label: "Booked", color: COLORS.blue, bg: COLORS.blueLight },
  { key: "closed", label: "Closed", color: COLORS.green, bg: COLORS.greenLight },
  { key: "no-show", label: "No-Show", color: COLORS.yellow, bg: COLORS.yellowLight },
  { key: "not-interested", label: "Not Interested", color: COLORS.red, bg: COLORS.redLight },
  { key: "callback", label: "Callback", color: COLORS.primary, bg: COLORS.primaryLight },
];

const SYSTEM_PROMPT = `Sales coach using NEPQ (Jeremy Miner). Return ONLY valid JSON, no markdown.
NEPQ: Connection (trust/rapport), Situation (current state), Problem Awareness (discover pain), Solution Awareness (see the fix), Consequence (cost of inaction), Commitment (trial close).
Score 1-10 each. Quote EXACT transcript words for improvements and rewrites.
JSON format: {"overallScore":0,"maxScore":70,"summary":"1-2 sentences","categories":[{"name":"Connection & Rapport","score":0,"maxScore":10,"assessment":"brief"},{"name":"Situation Questions","score":0,"maxScore":10,"assessment":"brief"},{"name":"Problem Awareness","score":0,"maxScore":10,"assessment":"brief"},{"name":"Solution Awareness","score":0,"maxScore":10,"assessment":"brief"},{"name":"Objection Handling","score":0,"maxScore":10,"assessment":"brief"},{"name":"Closing & Commitment","score":0,"maxScore":10,"assessment":"brief"},{"name":"Tone & Listening","score":0,"maxScore":10,"assessment":"brief"}],"excerpts":[{"type":"improvement","label":"issue label","quote":"exact transcript words","rewrite":"NEPQ phrasing","nepqPrinciple":"principle name","explanation":"why better"}],"strengths":[{"quote":"exact words","explanation":"why effective"}],"coaching":"specific NEPQ techniques, phrases to use, what to stop/start doing"}`;

/* ─── Helpers ─── */
function loadData(): AppData {
  if (typeof window === "undefined") return { agents: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { agents: [] };
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getWeekRange(weekStr: string) {
  const [year, week] = weekStr.split("-W").map(Number);
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const start = new Date(jan1);
  start.setDate(jan1.getDate() + (week - 1) * 7 - dayOfWeek + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function filterCalls(calls: Call[], weekFilter: string): Call[] {
  if (!weekFilter) return calls;
  const { start, end } = getWeekRange(weekFilter);
  return calls.filter((c) => {
    const d = new Date(c.date);
    return d >= start && d <= end;
  });
}

function scoreColor(pct: number) {
  if (pct >= 0.7) return COLORS.green;
  if (pct >= 0.4) return COLORS.yellow;
  return COLORS.red;
}

/* ─── Components ─── */

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${COLORS.border}`, flex: "1 1 160px", minWidth: 140 }}>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, height = 8 }: { value: number; max: number; height?: number }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <div style={{ background: "#e5e7eb", borderRadius: height / 2, height, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", borderRadius: height / 2, background: scoreColor(pct), transition: "width 0.3s" }} />
    </div>
  );
}

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? score / max : 0;
  const color = scoreColor(pct);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct);
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.5s" }} />
      <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{score}</text>
      <text x="50" y="62" textAnchor="middle" fontSize="11" fill={COLORS.textSecondary}>/ {max}</text>
    </svg>
  );
}

function AnalysisReport({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div style={{ marginTop: 16 }}>
      {/* Overall Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <ScoreRing score={analysis.overallScore} max={analysis.maxScore} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Overall NEPQ Score</div>
          <div style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{analysis.summary}</div>
        </div>
      </div>

      {/* Category Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {analysis.categories?.map((cat, i) => (
          <div key={i} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
              <span style={{ fontWeight: 700, color: scoreColor(cat.score / cat.maxScore), fontSize: 14 }}>{cat.score}/{cat.maxScore}</span>
            </div>
            <ProgressBar value={cat.score} max={cat.maxScore} />
            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8 }}>{cat.assessment}</div>
          </div>
        ))}
      </div>

      {/* Excerpts to Improve */}
      {analysis.excerpts?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Transcript Moments to Improve</h3>
          {analysis.excerpts.map((ex, i) => (
            <div key={i} style={{ borderLeft: `4px solid ${COLORS.red}`, borderRadius: 8, padding: 16, marginBottom: 12, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderLeftColor: COLORS.red, borderLeftWidth: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{ex.label}</span>
                <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>{ex.nepqPrinciple}</span>
              </div>
              <div style={{ background: COLORS.redLight, padding: 12, borderRadius: 6, fontStyle: "italic", fontSize: 13, marginBottom: 8, color: "#991b1b" }}>&ldquo;{ex.quote}&rdquo;</div>
              <div style={{ background: COLORS.blueLight, padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 8, color: "#1e40af" }}>
                <strong>Better approach:</strong> &ldquo;{ex.rewrite}&rdquo;
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{ex.explanation}</div>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {analysis.strengths?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>What Worked Well</h3>
          {analysis.strengths.map((s, i) => (
            <div key={i} style={{ borderLeft: `4px solid ${COLORS.green}`, borderRadius: 8, padding: 16, marginBottom: 12, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderLeftColor: COLORS.green, borderLeftWidth: 4 }}>
              <div style={{ background: COLORS.greenLight, padding: 12, borderRadius: 6, fontStyle: "italic", fontSize: 13, marginBottom: 8, color: "#065f46" }}>&ldquo;{s.quote}&rdquo;</div>
              <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{s.explanation}</div>
            </div>
          ))}
        </div>
      )}

      {/* Coaching */}
      {analysis.coaching && (
        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginTop: 0, marginBottom: 8 }}>NEPQ Coaching Recommendation</h3>
          <div style={{ fontSize: 14, color: "#3730a3", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{analysis.coaching}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Main App ─── */
export default function Page() {
  const [data, setData] = useState<AppData>({ agents: [] });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState("");
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const [expandedTranscript, setExpandedTranscript] = useState<Record<string, boolean>>({});
  const [analyzingCalls, setAnalyzingCalls] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setData(loadData());
  }, []);

  const persist = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const selectedAgent = data.agents.find((a) => a.id === selectedAgentId) || null;

  /* ─── Agent Actions ─── */
  function addAgent() {
    const name = prompt("Enter agent name:");
    if (!name?.trim()) return;
    const agent: Agent = { id: uid(), name: name.trim(), calls: [], createdAt: new Date().toISOString() };
    persist({ agents: [...data.agents, agent] });
  }

  function removeAgent(id: string) {
    if (!confirm("Remove this agent and all their calls?")) return;
    persist({ agents: data.agents.filter((a) => a.id !== id) });
    if (selectedAgentId === id) setSelectedAgentId(null);
  }

  /* ─── Call Actions ─── */
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function addCalls(agentId: string, calls: Call[]) {
    if (!calls.length) return;
    setData((prev) => {
      const updated = {
        agents: prev.agents.map((a) =>
          a.id === agentId ? { ...a, calls: [...a.calls, ...calls] } : a
        ),
      };
      saveData(updated);
      return updated;
    });
  }

  function processFiles(files: File[], agentId: string) {
    const newCalls: Call[] = [];
    let loaded = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text?.trim()) {
          newCalls.push({
            id: uid(),
            date: new Date().toISOString(),
            fileName: file.name,
            transcript: text,
            analysis: null,
            outcome: "",
          });
        }
        loaded++;
        if (loaded === files.length) addCalls(agentId, newCalls);
      };
      reader.onerror = () => {
        loaded++;
        if (loaded === files.length) addCalls(agentId, newCalls);
      };
      reader.readAsText(file);
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedAgent || !e.target.files) return;
    const files = Array.from(e.target.files);
    if (!files.length) return;
    processFiles(files, selectedAgent.id);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!selectedAgent) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    processFiles(files, selectedAgent.id);
  }

  function handlePasteSubmit() {
    if (!selectedAgent || !pasteText.trim()) return;
    addCalls(selectedAgent.id, [{
      id: uid(),
      date: new Date().toISOString(),
      fileName: `Pasted ${new Date().toLocaleString()}`,
      transcript: pasteText.trim(),
      analysis: null,
      outcome: "",
    }]);
    setPasteText("");
    setShowPaste(false);
  }

  function setOutcome(agentId: string, callId: string, outcome: string) {
    const agents = data.agents.map((a) =>
      a.id === agentId
        ? { ...a, calls: a.calls.map((c) => (c.id === callId ? { ...c, outcome: c.outcome === outcome ? "" : outcome } : c)) }
        : a
    );
    persist({ agents });
  }

  function deleteCall(agentId: string, callId: string) {
    if (!confirm("Delete this call?")) return;
    const agents = data.agents.map((a) =>
      a.id === agentId ? { ...a, calls: a.calls.filter((c) => c.id !== callId) } : a
    );
    persist({ agents });
  }

  async function analyzeCall(agentId: string, callId: string) {
    const agent = data.agents.find((a) => a.id === agentId);
    const call = agent?.calls.find((c) => c.id === callId);
    if (!call) return;

    setAnalyzingCalls((p) => ({ ...p, [callId]: true }));
    try {
      const transcript = call.transcript.slice(0, 6000);
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Analyze this sales call transcript:\n\n${transcript}` }],
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "API error");

      let text = resData.content?.[0]?.text || "";
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const analysis: AnalysisResult = JSON.parse(text);

      const agents = data.agents.map((a) =>
        a.id === agentId
          ? { ...a, calls: a.calls.map((c) => (c.id === callId ? { ...c, analysis } : c)) }
          : a
      );
      persist({ agents });
      setExpandedAnalysis((p) => ({ ...p, [callId]: true }));
    } catch (err) {
      alert("Analysis failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setAnalyzingCalls((p) => ({ ...p, [callId]: false }));
    }
  }

  /* ─── Computed Stats ─── */
  function agentStats(agent: Agent) {
    const calls = filterCalls(agent.calls, weekFilter);
    const total = calls.length;
    const booked = calls.filter((c) => c.outcome === "booked").length;
    const closed = calls.filter((c) => c.outcome === "closed").length;
    const noShow = calls.filter((c) => c.outcome === "no-show").length;
    const closeRate = total > 0 ? closed / total : 0;
    const bookToClose = booked > 0 ? closed / booked : 0;
    return { total, booked, closed, noShow, closeRate, bookToClose };
  }

  function globalStats() {
    let total = 0, booked = 0, closed = 0;
    data.agents.forEach((a) => {
      const s = agentStats(a);
      total += s.total;
      booked += s.booked;
      closed += s.closed;
    });
    const bookToClose = booked > 0 ? closed / booked : 0;
    return { total, booked, closed, bookToClose };
  }

  const gStats = globalStats();

  /* ─── Styles ─── */
  const btnStyle: React.CSSProperties = {
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  };

  const btnSmall: React.CSSProperties = {
    ...btnStyle,
    padding: "5px 12px",
    fontSize: 12,
    borderRadius: 6,
  };

  const linkBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    color: COLORS.red,
    cursor: "pointer",
    fontSize: 12,
    textDecoration: "underline",
    padding: 0,
  };

  /* ─── Render ─── */
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg }}>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1001,
          background: COLORS.primary,
          color: COLORS.white,
          border: "none",
          borderRadius: 8,
          width: 40,
          height: 40,
          fontSize: 20,
          cursor: "pointer",
          ...(typeof window !== "undefined" && window.innerWidth < 768 ? { display: "flex", alignItems: "center", justifyContent: "center" } : {}),
        }}
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: COLORS.white,
          borderRight: `1px solid ${COLORS.border}`,
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : undefined,
          bottom: 0,
          zIndex: 1000,
          overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: COLORS.primary, marginBottom: 4, cursor: "pointer" }} onClick={() => setSelectedAgentId(null)}>
          Sales Coach
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 }}>NEPQ Call Analysis</div>

        <button onClick={() => setSelectedAgentId(null)} style={{ ...btnStyle, width: "100%", marginBottom: 8, background: !selectedAgentId ? COLORS.primary : COLORS.white, color: !selectedAgentId ? COLORS.white : COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}>
          Dashboard
        </button>

        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 }}>Agents</div>

        {data.agents.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 2,
              background: selectedAgentId === a.id ? COLORS.primaryLight : "transparent",
              fontWeight: selectedAgentId === a.id ? 600 : 400,
            }}
            onClick={() => { setSelectedAgentId(a.id); setSidebarOpen(false); }}
          >
            <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeAgent(a.id); }}
              style={{ background: "none", border: "none", color: COLORS.textSecondary, cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
              title="Remove agent"
            >
              &times;
            </button>
          </div>
        ))}

        <button onClick={addAgent} style={{ ...btnStyle, width: "100%", marginTop: 12, background: COLORS.white, color: COLORS.primary, border: `2px dashed ${COLORS.primary}` }}>
          + Add Agent
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 260, padding: "32px 40px", maxWidth: 1100 }}>
        {/* Week Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Filter by week:</label>
          <input
            type="week"
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}
          />
          <button onClick={() => setWeekFilter("")} style={{ ...btnSmall, background: weekFilter ? COLORS.white : COLORS.primary, color: weekFilter ? COLORS.textPrimary : COLORS.white, border: `1px solid ${COLORS.border}` }}>
            All Time
          </button>
        </div>

        {!selectedAgent ? (
          /* ─── Dashboard View ─── */
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, marginTop: 0 }}>Dashboard</h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              <StatCard label="Total Calls" value={gStats.total} />
              <StatCard label="Booked" value={gStats.booked} />
              <StatCard label="Closed" value={gStats.closed} />
              <StatCard label="Book-to-Close %" value={`${(gStats.bookToClose * 100).toFixed(0)}%`} />
            </div>

            {data.agents.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: COLORS.textSecondary }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#128101;</div>
                <div style={{ fontSize: 16 }}>No agents yet. Add one from the sidebar.</div>
              </div>
            ) : (
              <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Agent", "Calls", "Booked", "Closed", "No-Show", "Close Rate", "Progress"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.agents.map((a) => {
                      const s = agentStats(a);
                      return (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: "12px 16px" }}>
                            <span onClick={() => setSelectedAgentId(a.id)} style={{ color: COLORS.primary, cursor: "pointer", fontWeight: 600 }}>
                              {a.name}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>{s.total}</td>
                          <td style={{ padding: "12px 16px" }}>{s.booked}</td>
                          <td style={{ padding: "12px 16px" }}>{s.closed}</td>
                          <td style={{ padding: "12px 16px" }}>{s.noShow}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: scoreColor(s.closeRate) === COLORS.green ? COLORS.greenLight : scoreColor(s.closeRate) === COLORS.yellow ? COLORS.yellowLight : COLORS.redLight, color: scoreColor(s.closeRate) }}>
                              {(s.closeRate * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", minWidth: 100 }}>
                            <ProgressBar value={s.closeRate * 100} max={100} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* ─── Agent Profile View ─── */
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, marginTop: 0 }}>{selectedAgent.name}</h1>

            {/* Agent Stat Cards */}
            {(() => {
              const s = agentStats(selectedAgent);
              return (
                <>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <StatCard label="Total Calls" value={s.total} />
                    <StatCard label="Booked" value={s.booked} />
                    <StatCard label="Closed" value={s.closed} />
                    <StatCard label="Book-to-Close %" value={`${(s.bookToClose * 100).toFixed(0)}%`} />
                    <StatCard label="No-Show" value={s.noShow} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Close Rate</span>
                    <div style={{ flex: 1, maxWidth: 300 }}>
                      <ProgressBar value={s.closeRate * 100} max={100} height={10} />
                    </div>
                    <span style={{ fontWeight: 700, color: scoreColor(s.closeRate), fontSize: 14 }}>
                      {(s.closeRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </>
              );
            })()}

            {/* Upload Area */}
            <div style={{ marginBottom: 24 }}>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? COLORS.primary : "#c7d2fe"}`,
                  borderRadius: 12,
                  padding: 28,
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "#e0e7ff" : COLORS.primaryLight,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>&#128196;</div>
                <div style={{ fontWeight: 600, color: COLORS.primary, fontSize: 14 }}>Drop files here or click to browse</div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Supports .txt, .md, .csv, .json</div>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.text" multiple onChange={handleFileUpload} style={{ display: "none" }} />
              </div>

              <div style={{ textAlign: "center", margin: "12px 0", fontSize: 12, color: COLORS.textSecondary, fontWeight: 600 }}>OR</div>

              {!showPaste ? (
                <button
                  onClick={() => setShowPaste(true)}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    background: COLORS.white,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.primary,
                  }}
                >
                  &#9998; Paste transcript text
                </button>
              ) : (
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", background: COLORS.white }}>
                  <textarea
                    autoFocus
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your transcript here..."
                    style={{
                      width: "100%",
                      minHeight: 150,
                      padding: 16,
                      border: "none",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.6,
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 12px", borderTop: `1px solid ${COLORS.border}`, background: "#f9fafb" }}>
                    <button
                      onClick={() => { setShowPaste(false); setPasteText(""); }}
                      style={{ padding: "8px 16px", border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.white, cursor: "pointer", fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim()}
                      style={{
                        padding: "8px 20px",
                        border: "none",
                        borderRadius: 8,
                        background: pasteText.trim() ? COLORS.primary : "#c7d2fe",
                        color: COLORS.white,
                        cursor: pasteText.trim() ? "pointer" : "not-allowed",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Add Transcript
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Calls List */}
            {filterCalls(selectedAgent.calls, weekFilter)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((call) => (
                <div key={call.id} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{call.fileName}</div>
                      <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{new Date(call.date).toLocaleDateString()} {new Date(call.date).toLocaleTimeString()}</div>
                    </div>
                    <button onClick={() => deleteCall(selectedAgent.id, call.id)} style={linkBtn}>Delete</button>
                  </div>

                  {/* Outcome Pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setOutcome(selectedAgent.id, call.id, o.key)}
                        style={{
                          padding: "4px 14px",
                          borderRadius: 20,
                          border: `1.5px solid ${o.color}`,
                          background: call.outcome === o.key ? o.bg : "transparent",
                          color: o.color,
                          fontWeight: call.outcome === o.key ? 700 : 500,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {call.analysis ? (
                      <>
                        <button onClick={() => setExpandedAnalysis((p) => ({ ...p, [call.id]: !p[call.id] }))} style={btnSmall}>
                          {expandedAnalysis[call.id] ? "Hide" : "Show"} Analysis
                        </button>
                        <button onClick={() => analyzeCall(selectedAgent.id, call.id)} disabled={analyzingCalls[call.id]} style={{ ...btnSmall, background: COLORS.white, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                          {analyzingCalls[call.id] ? "Analyzing..." : "Re-analyze"}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => analyzeCall(selectedAgent.id, call.id)} disabled={analyzingCalls[call.id]} style={btnSmall}>
                        {analyzingCalls[call.id] ? "Analyzing..." : "Analyze Transcript"}
                      </button>
                    )}
                    <button onClick={() => setExpandedTranscript((p) => ({ ...p, [call.id]: !p[call.id] }))} style={{ ...btnSmall, background: COLORS.white, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}>
                      {expandedTranscript[call.id] ? "Hide" : "Show"} Transcript
                    </button>
                  </div>

                  {/* Analysis */}
                  {expandedAnalysis[call.id] && call.analysis && <AnalysisReport analysis={call.analysis} />}

                  {/* Transcript */}
                  {expandedTranscript[call.id] && (
                    <div style={{ marginTop: 16, background: "#f9fafb", borderRadius: 8, padding: 16, maxHeight: 400, overflow: "auto" }}>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{call.transcript}</pre>
                    </div>
                  )}
                </div>
              ))}

            {filterCalls(selectedAgent.calls, weekFilter).length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textSecondary }}>No calls yet. Upload a transcript above.</div>
            )}
          </>
        )}
      </main>

      {/* Mobile responsive style */}
      <style>{`
        @media (max-width: 768px) {
          aside { position: fixed !important; transform: translateX(${sidebarOpen ? "0" : "-100%"}); transition: transform 0.2s; }
          main { margin-left: 0 !important; padding: 20px 16px !important; padding-top: 60px !important; }
          button[style*="display: none"] { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
