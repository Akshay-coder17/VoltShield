"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PreemptiveStrategy } from "@/lib/types";

interface StrategyPanelProps {
  strategy: PreemptiveStrategy | null;
  isActive?: boolean;
}

export default function StrategyPanel({ strategy, isActive = false }: StrategyPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {strategy && (
        <motion.div
          key={strategy.anomaly_type}
          className={`glass-card strategy-card ${isActive ? "preemptive-active" : ""}`}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="card-header">
            <span className={`indicator ${isActive ? "green" : "cyan"}`} />
            <span>{isActive ? "🚀 Pre-Emptive Mode READY" : "Pre-Emptive Strategy Active"}</span>
          </div>

          <div style={{ padding: "16px 20px" }}>
            {/* Badge Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span className="strategy-badge">
                {isActive ? "✓ PATTERN LEARNED" : "🧠 PATTERN RECOGNIZED"}
              </span>
              <span
                className="strategy-badge"
                style={{
                  background: isActive
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,0,204,0.1)",
                  borderColor: isActive
                    ? "rgba(0,255,136,0.3)"
                    : "rgba(255,0,204,0.3)",
                  color: isActive ? "var(--neon-green)" : "var(--neon-magenta)",
                }}
              >
                {strategy.anomaly_type.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>

            {/* Strategy details */}
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                lineHeight: 1.8,
                color: isActive ? "var(--neon-green)" : "var(--text-secondary)",
                margin: "0 0 14px",
              }}
            >
              {isActive
                ? `Preemptive adaptation ACTIVE. System ready for instant response. ${strategy.message}`
                : strategy.message}
            </p>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 24,
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Occurrences: </span>
                <span className="neon-text-cyan">{strategy.occurrences}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Avg Severity: </span>
                <span className="neon-text-amber">
                  {Math.round(strategy.avg_severity * 100)}%
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Adapted Gain: </span>
                <span className={isActive ? "neon-text-green" : "neon-text-magenta"}>
                  {strategy.adapted_gain.toFixed(3)}x
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
