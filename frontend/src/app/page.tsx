"use client";

import React, { Suspense } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import StatusBar from "@/components/StatusBar";
import WaveformChart from "@/components/WaveformChart";
import AgentConsole from "@/components/AgentConsole";
import GaugeCard from "@/components/GaugeCard";
import PanicButton from "@/components/PanicButton";
import StrategyPanel from "@/components/StrategyPanel";

function DashboardContent() {
  const {
    isConnected,
    waveData,
    latestFrame,
    connectionAttempts,
    isPanic,
    isPreemptiveActive,
  } = useWebSocket();

  const agentStatus = latestFrame?.agent_status ?? null;
  const learningMetric = latestFrame?.learning_metric ?? null;

  // Apply critical state styling
  const rootStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  };

  if (isPanic) {
    rootStyle.animation = "criticalPulse 0.8s ease-in-out infinite";
    rootStyle.borderRadius = "4px";
  }

  return (
    <div style={rootStyle}>
      {/* ─── Top Status Bar ────────────────────────────────────── */}
      <StatusBar
        isConnected={isConnected}
        agentStatus={agentStatus}
        learningMetric={learningMetric}
        connectionAttempts={connectionAttempts}
      />

      {/* ─── Dashboard Grid ────────────────────────────────────── */}
      <div
        className={`dashboard-grid ${isPanic ? "critical-state" : ""} ${
          isPreemptiveActive ? "preemptive-active" : ""
        }`}
      >
        {/* Row 1: Waveform Charts (full width) */}
        <div className="full-width">
          <WaveformChart
            data={waveData}
            title="Original Telemetry — 3-Phase Power Wave"
            mode="original"
            indicatorColor={isPanic ? "red" : agentStatus?.anomaly_type ? "amber" : "green"}
            isPanic={isPanic}
          />
        </div>

        <div className="full-width">
          <WaveformChart
            data={waveData}
            title="AI-Stabilized Wave — After Agent Correction"
            mode="balanced"
            indicatorColor={isPreemptiveActive ? "green" : "cyan"}
            isPanic={isPanic}
          />
        </div>

        {/* Row 2: Agent Console + Gauges/Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AgentConsole logs={agentStatus?.reasoning_log ?? []} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Gauges Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <GaugeCard
              label="Grid Health"
              value={learningMetric?.grid_health ?? 0}
              color={
                isPanic
                  ? "#ff3355"
                  : (learningMetric?.grid_health ?? 0) > 0.7
                  ? "#00ff88"
                  : (learningMetric?.grid_health ?? 0) > 0.4
                  ? "#ffaa00"
                  : "#ff3355"
              }
              glowColor={
                isPanic
                  ? "rgba(255,51,85,0.3)"
                  : (learningMetric?.grid_health ?? 0) > 0.7
                  ? "rgba(0,255,136,0.3)"
                  : (learningMetric?.grid_health ?? 0) > 0.4
                  ? "rgba(255,170,0,0.3)"
                  : "rgba(255,51,85,0.3)"
              }
              icon={isPanic ? "⚠" : "⚡"}
            />
            <GaugeCard
              label={isPreemptiveActive ? "🧠 Preemptive Mode" : "AI Learning"}
              value={learningMetric?.learning_progress ?? 0}
              color={isPreemptiveActive ? "#00ff88" : "#00f2ff"}
              glowColor={isPreemptiveActive ? "rgba(0,255,136,0.3)" : "rgba(0,242,255,0.3)"}
              icon={isPreemptiveActive ? "✓" : "🧠"}
            />
          </div>

          {/* Panic + Anomaly Controls */}
          <PanicButton isConnected={isConnected} isPanic={isPanic} />
        </div>

        {/* Row 3: Pre-emptive Strategy Panel (full width) */}
        <div className="full-width">
          <StrategyPanel strategy={agentStatus?.preemptive_strategy ?? null} isActive={isPreemptiveActive} />
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0a0f1f",
      color: "#00f2ff",
      fontFamily: "'Monaco', monospace",
    }}>
      <h1 style={{ marginBottom: 20, fontSize: 24 }}>VoltShield AI</h1>
      <p style={{ marginBottom: 10 }}>Initializing dashboard...</p>
      <p style={{ fontSize: 12, color: "#666" }}>
        Attempting to connect to backend service
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
