"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const UBAG_ICON = "https://lh5.googleusercontent.com/swiXiaqSWjfVRdkMPqn4zLc4yXpbs-vg-99-87VSXPpmfofHi8QPLVx7mEJ7aapCXG81UY7bIOGo7oNFPoMRaMZOpNPxXIz90AlFzU8TE8nBIrwXwYQ2MOE2Ix58PQ0hJk2s80c0v0-04HnweA";

const LOADING_PHRASES = [
  "Teka brod, isipin ko muna...",
  "Skaler brod, nagiisip ako...",
  "Yosi ka muna, wait lang...",
  "Ningit ka muna sa eyabab sa dokil habang nagiisip ako...",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: { label: string; success: boolean }[];
}

export default function ChatBox() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const phraseInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingPhrase]);

  useEffect(() => {
    if (loading) {
      let idx = 0;
      setLoadingPhrase(LOADING_PHRASES[0]);
      phraseInterval.current = setInterval(() => {
        idx = (idx + 1) % LOADING_PHRASES.length;
        setLoadingPhrase(LOADING_PHRASES[idx]);
      }, 3000);
    } else {
      if (phraseInterval.current) clearInterval(phraseInterval.current);
    }
    return () => {
      if (phraseInterval.current) clearInterval(phraseInterval.current);
    };
  }, [loading]);

  if (pathname === "/login") return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          user_role: user?.role || "brod",
          user_id: user?.id,
          user_name: user?.first_name || user?.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: err.error || "Dehins yan brod, parang walang connection. Try mo ulit!" },
        ]);
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            actions: data.actions,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Dehins yan brod, parang walang connection. Try mo ulit!" },
      ]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 overflow-hidden border-2 border-[#d4a843]"
        title="Ubag AI Assistant"
      >
        <img src={UBAG_ICON} alt="Ubag" className="w-full h-full object-cover" />
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[400px] h-[70vh] sm:h-[540px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={UBAG_ICON} alt="Ubag" className="w-9 h-9 rounded-full border border-white/30" />
              <div>
                <div className="font-semibold text-sm">Ubag</div>
                <div className="text-xs text-white/60">AI Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center mt-10 space-y-3">
                <img src={UBAG_ICON} alt="Ubag" className="w-16 h-16 rounded-full mx-auto border-2 border-[#d4a843]" />
                <p className="text-gray-800 font-semibold text-sm">Orayt brod! Ako si Ubag!</p>
                <p className="text-gray-500 text-xs px-4">
                  Anong kelangan mo brod?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
                {/* Action results */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    {msg.actions.map((a, j) => (
                      <div key={j} className="flex items-center gap-2 text-green-700">
                        {a.success ? (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        <span>{a.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 italic">
                  {loadingPhrase}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Sabihin mo lang brod, ano kailangan mo..."
              rows={2}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-[#d4a843] text-white rounded-md text-sm font-medium hover:bg-[#b8922e] disabled:opacity-50 self-end"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
