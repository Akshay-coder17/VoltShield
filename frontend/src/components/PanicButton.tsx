"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const BACKEND_URL = "http://localhost:8000";
const COOLDOWN_MS = 5000;

interface PanicButtonProps {
  isConnected: boolean;
  isPanic?: boolean;
}

export default function PanicButton({ isConnected, isPanic = false }: PanicButtonProps) {
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownPercent, setCooldownPercent] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [bloomActive, setBloomActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bloomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger panic endpoint
  const triggerPanic = useCallback(async () => {
    if (isCoolingDown || !isConnected) return;

    setIsTriggering(true);
    setBloomActive(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/anomaly/panic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        console.log("🚨 Panic mode triggered!");
      } else {
        console.error("Failed to trigger panic:", response.statusText);
      }
    } catch (err) {
      console.error("Panic trigger failed:", err);
    }

    setIsTriggering(false);

    // Bloom effect duration
    if (bloomTimeoutRef.current) clearTimeout(bloomTimeoutRef.current);
    bloomTimeoutRef.current = setTimeout(() => {
      setBloomActive(false);
    }, 1200); // Match bloomFlash animation duration

    // Start cooldown
    setIsCoolingDown(true);
    setCooldownPercent(100);
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / COOLDOWN_MS) * 100);
      setCooldownPercent(remaining);
      if (remaining <= 0) {
        setIsCoolingDown(false);
        setCooldownPercent(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 50);
  }, [isCoolingDown, isConnected]);

  // Trigger individual anomalies
  const triggerAnomaly = useCallback(
    async (type: string) => {
      if (!isConnected) return;
      try {
        const response = await fetch(`${BACKEND_URL}/api/anomaly/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomaly_type: type,
            severity: 0.6,
            target_phase: "b",
            duration_cycles: 40,
          }),
        });

        if (response.ok) {
          console.log(`Triggered ${type}`);
        }
      } catch (err) {
        console.error("Anomaly trigger failed:", err);
      }
    },
    [isConnected]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (bloomTimeoutRef.current) clearTimeout(bloomTimeoutRef.current);
    };
  }, []);

  const buttonClassName = `panic-button ${isCoolingDown || !isConnected ? "disabled" : ""} ${
    bloomActive ? "active" : ""
  } ${isPanic ? "panic-active" : ""}`;

  return (
    <div className="glass-card">
      <div className="card-header">
        <span className={`indicator ${isCoolingDown || isPanic ? "red" : "green"}`} />
        <span>Anomaly Control</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.6rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {isPanic ? "⚠️ PANIC" : isConnected ? "Ready" : "Offline"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "20px",
        }}
      >
        <motion.button
          className={buttonClassName}
          onClick={triggerPanic}
          whileTap={{ scale: 0.95 }}
          animate={
            isTriggering
              ? {
                  x: [0, -4, 4, -4, 4, 0],
                  transition: { duration: 0.4 },
                }
              : {}
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {isCoolingDown ? "COOLDOWN" : "⚠ PANIC MODE"}
          {isCoolingDown && (
            <span className="cooldown-bar" style={{ width: `${cooldownPercent}%` }} />
          )}
        </motion.button>

        {!isConnected && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--neon-red)",
            }}
          >
            Backend disconnected
          </span>
        )}

        {isPanic && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--neon-red)",
              animation: "phaseFlash 0.6s ease-out infinite",
            }}
          >
            SYSTEM IN PANIC MODE
          </motion.span>
        )}
      </div>

      {/* Individual Anomaly Triggers */}
      <div className="anomaly-triggers">
        <button
          className="trigger-btn sag"
          onClick={() => triggerAnomaly("voltage_sag")}
          disabled={!isConnected}
        >
          ⚡ Voltage Sag
        </button>
        <button
          className="trigger-btn harmonic"
          onClick={() => triggerAnomaly("harmonic_spike")}
          disabled={!isConnected}
        >
          〰 Harmonic Spike
        </button>
        <button
          className="trigger-btn imbalance"
          onClick={() => triggerAnomaly("phase_imbalance")}
          disabled={!isConnected}
        >
          ◑ Phase Imbalance
        </button>
      </div>
    </div>
  );
}
