"use client";

import React from "react";
import type { AgentStatus, LearningMetric } from "@/lib/types";

interface StatusBarProps {
  isConnected: boolean;
  agentStatus: AgentStatus | null;
  learningMetric: LearningMetric | null;
  connectionAttempts: number;
}

function getStateLabel(state: string): { text: string; color: string } {
  switch (state) {
    case "monitoring":
      return { text: "MONITORING", color: "var(--neon-green)" };
    case "planning":
      return { text: "PLANNING", color: "var(--neon-cyan)" };
    case "acting":
      return { text: "ACTING", color: "var(--neon-magenta)" };
    case "reflecting":
      return { text: "REFLECTING", color: "var(--neon-amber)" };
    case "preemptive":
      return { text: "PRE-EMPTIVE", color: "var(--neon-cyan)" };
    default:
      return { text: "UNKNOWN", color: "var(--text-muted)" };
  }
}

export default function StatusBar({
  isConnected,
  agentStatus,
  learningMetric,
  connectionAttempts,
}: StatusBarProps) {
  const stateInfo = agentStatus
    ? getStateLabel(agentStatus.state)
    : { text: "OFFLINE", color: "var(--neon-red)" };

  return (
    <div className="status-bar">
      {/* Logo */}
      <div className="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <polygon
            points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
            fill="none"
            stroke="#00f2ff"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 4px rgba(0,242,255,0.6))" }}
          />
        </svg>
        <span className="neon-text-cyan">VOLTSHIELD</span>
        <span
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            fontWeight: 400,
          }}
        >
          AI v1.0
        </span>
      </div>

      {/* Metrics */}
      <div className="metrics">
        {/* Connection status */}
        <div className="metric-item">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isConnected ? "var(--neon-green)" : "var(--neon-red)",
              boxShadow: isConnected
                ? "0 0 8px var(--neon-green-dim)"
                : "0 0 8px var(--neon-red-dim)",
              display: "inline-block",
              animation: isConnected ? "indicatorPulse 2s ease-in-out infinite" : "none",
            }}
          />
          <span className="value" style={{ color: isConnected ? "var(--neon-green)" : "var(--neon-red)" }}>
            {isConnected ? "CONNECTED" : `RECONNECTING (${connectionAttempts})`}
          </span>
        </div>

        {/* Agent state */}
        <div className="metric-item">
          <span>AGENT:</span>
          <span className="value" style={{ color: stateInfo.color }}>
            {stateInfo.text}
          </span>
        </div>

        {/* Anomalies handled */}
        <div className="metric-item">
          <span>ANOMALIES:</span>
          <span className="value neon-text-magenta">
            {learningMetric?.total_anomalies_handled ?? 0}
          </span>
        </div>

        {/* Grid health */}
        <div className="metric-item">
          <span>GRID:</span>
          <span
            className="value"
            style={{
              color:
                (learningMetric?.grid_health ?? 1) > 0.7
                  ? "var(--neon-green)"
                  : (learningMetric?.grid_health ?? 1) > 0.4
                  ? "var(--neon-amber)"
                  : "var(--neon-red)",
            }}
          >
            {Math.round((learningMetric?.grid_health ?? 0) * 100)}%
          </span>
        </div>

        {/* Strategy */}
        {agentStatus?.strategy && agentStatus.strategy !== "idle" && (
          <div className="metric-item">
            <span>MODE:</span>
            <span className="value neon-text-amber">
              {agentStatus.strategy.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
