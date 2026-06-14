"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReasoningEntry } from "@/lib/types";

interface AgentConsoleProps {
  logs: ReasoningEntry[];
}

const STEP_CONFIG: Record<string, { label: string; className: string }> = {
  plan: { label: "[PLAN]", className: "plan" },
  act: { label: "[ACT]", className: "act" },
  reflect: { label: "[REFLECT]", className: "reflect" },
};

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AgentConsole({ logs }: AgentConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Only scroll if NEW logs were added
  useEffect(() => {
    if (logs.length > prevLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = logs.length;
  }, [logs.length]); // Depend only on length, not the entire logs array

  // Memoize rendered entries to prevent unnecessary motion animations
  const renderedEntries = useMemo(() => {
    return logs.map((entry, i) => {
      const cfg = STEP_CONFIG[entry.step] || {
        label: `[${entry.step.toUpperCase()}]`,
        className: "plan",
      };
      return {
        id: `${entry.timestamp}`, // Use timestamp as stable key
        cfg,
        entry,
      };
    });
  }, [logs]);

  return (
    <div className="glass-card scanline-overlay">
      <div className="card-header">
        <span className="indicator cyan" />
        <span>Agent Reasoning Console</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.6rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          LIVE
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--neon-green)",
              marginLeft: 6,
              boxShadow: "0 0 6px var(--neon-green-dim)",
              animation: "indicatorPulse 1.5s ease-in-out infinite",
            }}
          />
        </span>
      </div>
      <div className="console-body" ref={scrollRef}>
        {logs.length === 0 && (
          <div
            style={{
              color: "var(--text-muted)",
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            Awaiting agent activity...
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {renderedEntries.map(({ id, cfg, entry }) => (
            <motion.div
              key={id}
              className="console-line"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ animationDelay: "0s", animationFillMode: "forwards" }}
            >
              <span className={`prefix ${cfg.className}`}>{cfg.label}</span>
              <span style={{ flex: 1 }}>{entry.message}</span>
              <span className="timestamp">{formatTime(entry.timestamp)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
