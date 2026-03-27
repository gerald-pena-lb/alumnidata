"use client";

import React, { useEffect, useRef, useState } from "react";

interface VoiceAgentProps {
  prospectName: string;
  teammateName: string;
}

export default function VoiceAgent({
  prospectName,
  teammateName,
}: VoiceAgentProps) {
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load ElevenLabs widget script
  useEffect(() => {
    if (document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) return;
    const script = document.createElement("script");
    script.src = "https://elevenlabs.io/convai-widget/index.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Fetch agent ID from session endpoint
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospectName, teammateName }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setAgentId(data.agentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }
    }
    init();
  }, [prospectName, teammateName]);

  // Render widget when agentId is ready
  useEffect(() => {
    if (!agentId || !widgetRef.current) return;

    widgetRef.current.innerHTML = "";

    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", agentId);
    widget.setAttribute("dynamic-variables", JSON.stringify({
      prospect_name: prospectName,
      teammate_name: teammateName,
    }));

    widgetRef.current.appendChild(widget);
  }, [agentId, prospectName, teammateName]);

  if (error) {
    return (
      <div style={styles.errorBox}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!agentId) {
    return <div style={styles.loading}>Loading voice agent...</div>;
  }

  return (
    <div style={styles.container}>
      <div ref={widgetRef} style={styles.widgetContainer} />
      <p style={styles.hint}>
        Click the microphone button below to start talking to Tiffany.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    width: "100%",
    minHeight: "200px",
  },
  widgetContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    minHeight: "100px",
  },
  loading: {
    padding: "40px",
    textAlign: "center",
    color: "#718096",
    fontSize: "14px",
  },
  errorBox: {
    padding: "12px 16px",
    backgroundColor: "#fed7d7",
    color: "#c53030",
    borderRadius: "8px",
    fontSize: "14px",
  },
  hint: {
    fontSize: "13px",
    color: "#718096",
    margin: 0,
  },
};
