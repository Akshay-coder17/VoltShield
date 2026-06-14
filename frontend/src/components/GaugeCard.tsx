"use client";

import React from "react";
import { motion } from "framer-motion";

interface GaugeCardProps {
  label: string;
  value: number; // 0.0 - 1.0
  color: string; // CSS color
  glowColor: string;
  icon?: string;
}

export default function GaugeCard({
  label,
  value,
  color,
  glowColor,
  icon,
}: GaugeCardProps) {
  const percentage = Math.round(value * 100);
  const radius = 64;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - value);
  const viewBoxSize = (radius + strokeWidth) * 2;
  const center = radius + strokeWidth;

  // Dynamic status label
  let statusLabel = "Nominal";
  let statusColor = color;
  if (value < 0.4) {
    statusLabel = "Critical";
    statusColor = "var(--neon-red)";
  } else if (value < 0.7) {
    statusLabel = "Degraded";
    statusColor = "var(--neon-amber)";
  }

  return (
    <div className="glass-card gauge-container">
      <svg
        width={viewBoxSize}
        height={viewBoxSize}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Animated fill arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
        {/* Inner subtle glow */}
        <circle
          cx={center}
          cy={center}
          r={radius - 20}
          fill="none"
          stroke={glowColor}
          strokeWidth={1}
          opacity={0.15}
        />
      </svg>

      {/* Center value overlay */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {icon && <span style={{ fontSize: "1.2rem", marginBottom: 2 }}>{icon}</span>}
        <span className="gauge-value" style={{ color }}>
          {percentage}
          <span style={{ fontSize: "0.9rem", opacity: 0.7 }}>%</span>
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            color: statusColor,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <span className="gauge-label">{label}</span>
    </div>
  );
}
