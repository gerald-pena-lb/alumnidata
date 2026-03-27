"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import VoiceAgent from "@/components/VoiceAgent";

export default function CallPage() {
  const searchParams = useSearchParams();
  const prospectName = searchParams.get("prospect") || "Guest";
  const teammateName = searchParams.get("teammate") || "our team";

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <a href="/" style={styles.backLink}>
            &larr; Back
          </a>
          <div>
            <h1 style={styles.title}>Voice Call</h1>
            <p style={styles.subtitle}>
              Speaking with <strong>{prospectName}</strong> &middot; Referred by{" "}
              {teammateName}
            </p>
          </div>
        </div>

        {/* Voice Agent */}
        <VoiceAgent
          prospectName={prospectName}
          teammateName={teammateName}
        />

        {/* Info Panel */}
        <div style={styles.infoPanel}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>LLM</span>
            <span style={styles.infoValue}>Claude Opus 4.6 (Anthropic)</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Voice</span>
            <span style={styles.infoValue}>ElevenLabs Conversational AI</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Framework</span>
            <span style={styles.infoValue}>NEPQ (Neuro-Emotional Persuasion Questioning)</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Stages</span>
            <span style={styles.infoValue}>
              Connect &rarr; Situation &rarr; Problem &rarr; Consequence &rarr;
              Wallet Test &rarr; Book Call
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Goal</span>
            <span style={styles.infoValue}>
              Book qualified prospect onto strategy call with Alinka
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    padding: "24px",
  },
  container: {
    maxWidth: "720px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "8px 0",
  },
  backLink: {
    fontSize: "14px",
    color: "#718096",
    textDecoration: "none",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#718096",
    margin: "2px 0 0",
  },
  infoPanel: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  infoItem: {
    display: "flex",
    gap: "12px",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  infoLabel: {
    color: "#718096",
    fontWeight: 600,
    minWidth: "80px",
    flexShrink: 0,
  },
  infoValue: {
    color: "#4a5568",
  },
};
