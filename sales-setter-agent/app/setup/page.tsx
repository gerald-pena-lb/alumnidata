"use client";

import React, { useState } from "react";

export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createAgent = async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data.success && data.agentId) {
        setAgentId(data.agentId);
        setStatus("success");
      } else {
        setErrorMsg(data.error || data.details || "Unknown error");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Agent Setup</h1>
        <p style={styles.subtitle}>One-time setup to create your ElevenLabs voice agent</p>

        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div>
              <h3 style={styles.stepTitle}>Add environment variables in Vercel</h3>
              <p style={styles.stepDesc}>
                Go to your Vercel project &rarr; Settings &rarr; Environment Variables and add:
              </p>
              <ul style={styles.envList}>
                <li><code>ANTHROPIC_API_KEY</code> — from console.anthropic.com</li>
                <li><code>ELEVENLABS_API_KEY</code> — from elevenlabs.io &rarr; Profile &rarr; API Keys</li>
                <li><code>LLM_WEBHOOK_URL</code> — your Vercel URL + /api/llm</li>
                <li><code>CALENDLY_API_KEY</code> — from Calendly integrations</li>
                <li><code>CALENDLY_SCHEDULING_URL</code> — Alinka&apos;s booking link</li>
                <li><code>CALENDLY_EVENT_TYPE_URI</code> — Alinka&apos;s event type</li>
              </ul>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div>
              <h3 style={styles.stepTitle}>Create the voice agent</h3>
              <p style={styles.stepDesc}>
                Click the button below. This creates the ElevenLabs agent with your
                NEPQ script and connects it to Claude Opus 4.6.
              </p>

              <button
                onClick={createAgent}
                disabled={status === "loading"}
                style={{
                  ...styles.button,
                  ...(status === "loading" ? styles.buttonDisabled : {}),
                }}
              >
                {status === "loading" ? "Creating agent..." : "Create Voice Agent"}
              </button>

              {status === "error" && (
                <div style={styles.errorBox}>
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}

              {status === "success" && agentId && (
                <div style={styles.successBox}>
                  <strong>Agent created!</strong>
                  <p style={{ margin: "8px 0 0" }}>
                    Your Agent ID: <code style={styles.code}>{agentId}</code>
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: "13px" }}>
                    Copy this ID and add it as <code>ELEVENLABS_AGENT_ID</code> in
                    your Vercel environment variables, then redeploy.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div>
              <h3 style={styles.stepTitle}>Add the Agent ID and redeploy</h3>
              <p style={styles.stepDesc}>
                Go back to Vercel &rarr; Settings &rarr; Environment Variables, add{" "}
                <code>ELEVENLABS_AGENT_ID</code> with the value above, then go to
                Deployments and click &quot;Redeploy&quot;.
              </p>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <div>
              <h3 style={styles.stepTitle}>You&apos;re live!</h3>
              <p style={styles.stepDesc}>
                Go to the <a href="/" style={styles.link}>home page</a> and start
                making calls. Send your prospects the link.
              </p>
            </div>
          </div>
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
  },
  card: {
    width: "100%",
    maxWidth: "600px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "32px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#718096",
    margin: "4px 0 24px",
  },
  steps: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  },
  step: {
    display: "flex",
    gap: "16px",
  },
  stepNumber: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#1a1a2e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1a202c",
    margin: "0 0 4px",
  },
  stepDesc: {
    fontSize: "13px",
    color: "#718096",
    lineHeight: "1.6",
    margin: 0,
  },
  envList: {
    fontSize: "13px",
    color: "#718096",
    lineHeight: "1.8",
    paddingLeft: "18px",
    marginTop: "8px",
  },
  button: {
    marginTop: "12px",
    padding: "10px 20px",
    backgroundColor: "#1a1a2e",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonDisabled: {
    backgroundColor: "#cbd5e0",
    cursor: "not-allowed",
  },
  errorBox: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#fed7d7",
    color: "#c53030",
    borderRadius: "8px",
    fontSize: "13px",
  },
  successBox: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#c6f6d5",
    color: "#276749",
    borderRadius: "8px",
    fontSize: "14px",
  },
  code: {
    backgroundColor: "#edf2f7",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "monospace",
    color: "#1a202c",
    userSelect: "all" as const,
  },
  link: {
    color: "#1a1a2e",
    fontWeight: 600,
    textDecoration: "underline",
  },
};
