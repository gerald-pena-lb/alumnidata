"use client";

import React, { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<{ role: "agent" | "user"; text: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");

  const conversation = useConversation({
    onMessage: (msg: { message?: string; source?: string }) => {
      if (msg.message && msg.source) {
        setMessages((prev) => [
          ...prev,
          { role: msg.source === "ai" ? "agent" : "user", text: msg.message! },
        ]);
      }
    },
    onError: (error: string) => console.error("ElevenLabs error:", error),
  });

  const isSpeaking = conversation.isSpeaking;
  const status = conversation.status;
  const isActive = status === "connected" || status === "connecting";

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Draw glowing sphere
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 70;

    let time = 0;

    const draw = () => {
      time += 0.03;
      ctx.clearRect(0, 0, size, size);

      const pulseAmount = isSpeaking ? 6 * Math.sin(time * 3) : 0;
      const radius = baseRadius + pulseAmount;

      // Outer glow layers
      if (isSpeaking) {
        for (let i = 3; i >= 0; i--) {
          const glowRadius = radius + 15 + i * 18;
          const alpha = 0.04 + (3 - i) * 0.025;
          const gradient = ctx.createRadialGradient(cx, cy, radius, cx, cy, glowRadius);
          gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`);
          gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Sphere gradient (3D effect)
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
        cx, cy, radius
      );
      if (isSpeaking) {
        sphereGrad.addColorStop(0, "#c4b5fd");
        sphereGrad.addColorStop(0.4, "#8b5cf6");
        sphereGrad.addColorStop(0.8, "#6d28d9");
        sphereGrad.addColorStop(1, "#4c1d95");
      } else if (isActive) {
        sphereGrad.addColorStop(0, "#e0e7ff");
        sphereGrad.addColorStop(0.4, "#a5b4fc");
        sphereGrad.addColorStop(0.8, "#818cf8");
        sphereGrad.addColorStop(1, "#6366f1");
      } else {
        sphereGrad.addColorStop(0, "#f1f5f9");
        sphereGrad.addColorStop(0.4, "#e2e8f0");
        sphereGrad.addColorStop(0.8, "#cbd5e1");
        sphereGrad.addColorStop(1, "#94a3b8");
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Highlight spot (3D shine)
      const shineGrad = ctx.createRadialGradient(
        cx - radius * 0.25, cy - radius * 0.3, 2,
        cx - radius * 0.25, cy - radius * 0.3, radius * 0.5
      );
      shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
      shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sound wave lines when speaking
      if (isSpeaking) {
        const lineCount = 48;
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2;
          const wave = Math.sin(time * 5 + i * 0.8) * 12 + 8;
          const x1 = cx + Math.cos(angle) * (radius + 3);
          const y1 = cy + Math.sin(angle) * (radius + 3);
          const x2 = cx + Math.cos(angle) * (radius + 3 + wave);
          const y2 = cy + Math.sin(angle) * (radius + 3 + wave);

          ctx.strokeStyle = `rgba(196, 181, 253, ${0.3 + Math.sin(time * 4 + i) * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isSpeaking, isActive]);

  const startCall = async () => {
    setMessages([]);
    await navigator.mediaDevices.getUserMedia({ audio: true });
    await conversation.startSession({
      agentId: AGENT_ID,
      connectionType: "webrtc",
    });
  };

  const endCall = async () => {
    await conversation.endSession();
  };

  const sendText = () => {
    if (!inputText.trim() || !isActive) return;
    conversation.sendUserMessage(inputText.trim());
    setMessages((prev) => [...prev, { role: "user", text: inputText.trim() }]);
    setInputText("");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <h1 style={styles.title}>Tiffany</h1>
        <p style={styles.subtitle}>Book Publishing Consultation</p>

        {/* Sphere */}
        <div style={styles.sphereWrapper}>
          <canvas ref={canvasRef} width={240} height={240} style={styles.canvas} />
        </div>

        {/* Status */}
        <p style={styles.statusText}>
          {status === "disconnected" && "Tap the mic to start"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" && (isSpeaking ? "Tiffany is speaking..." : "Listening...")}
        </p>

        {/* Transcript */}
        {messages.length > 0 && (
          <div ref={transcriptRef} style={styles.transcript}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === "agent" ? styles.agentMsg : styles.userMsg}>
                <span style={styles.msgRole}>{m.role === "agent" ? "Tiffany" : "You"}</span>
                <span style={styles.msgText}>{m.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        {isActive && (
          <div style={styles.inputArea}>
            {/* Mode toggle */}
            <div style={styles.modeToggle}>
              <button
                onClick={() => setInputMode("voice")}
                style={inputMode === "voice" ? styles.modeActive : styles.modeInactive}
              >
                Voice
              </button>
              <button
                onClick={() => setInputMode("text")}
                style={inputMode === "text" ? styles.modeActive : styles.modeInactive}
              >
                Type
              </button>
            </div>

            {inputMode === "text" && (
              <div style={styles.textInputRow}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendText()}
                  placeholder="Type your message..."
                  style={styles.textInput}
                />
                <button onClick={sendText} style={styles.sendButton}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mic / End button */}
        <div style={styles.micWrapper}>
          {!isActive ? (
            <button onClick={startCall} style={styles.micButton} aria-label="Start call">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          ) : (
            <button onClick={endCall} style={styles.endButton} aria-label="End call">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "#0f0f1a",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    maxWidth: "420px",
    width: "100%",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
  },
  subtitle: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "2px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    fontWeight: 500,
  },
  sphereWrapper: {
    marginTop: "16px",
    marginBottom: "4px",
  },
  canvas: {
    display: "block",
  },
  statusText: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: 500,
    margin: "0 0 12px",
  },
  transcript: {
    width: "100%",
    maxHeight: "180px",
    overflowY: "auto" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    marginBottom: "8px",
  },
  agentMsg: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  userMsg: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    alignItems: "flex-end" as const,
  },
  msgRole: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#8b5cf6",
  },
  msgText: {
    fontSize: "13px",
    color: "#e2e8f0",
    lineHeight: "1.5",
  },
  inputArea: {
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    marginBottom: "8px",
  },
  modeToggle: {
    display: "flex",
    justifyContent: "center",
    gap: "4px",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: "8px",
    padding: "3px",
  },
  modeActive: {
    padding: "6px 16px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#6366f1",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  modeInactive: {
    padding: "6px 16px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#94a3b8",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  textInputRow: {
    display: "flex",
    gap: "8px",
  },
  textInput: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "14px",
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    color: "#e2e8f0",
    outline: "none",
  },
  sendButton: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "#6366f1",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  micWrapper: {
    display: "flex",
    justifyContent: "center",
    marginTop: "4px",
  },
  micButton: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#6366f1",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
  },
  endButton: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(239, 68, 68, 0.4)",
  },
};
