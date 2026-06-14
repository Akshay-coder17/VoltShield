"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { WaveDataPoint } from "@/lib/types";

interface WaveformChartProps {
  data: WaveDataPoint[];
  title: string;
  mode: "original" | "balanced";
  indicatorColor: string;
  isPanic?: boolean;
}

export default function WaveformChart({
  data,
  title,
  mode,
  indicatorColor,
  isPanic = false,
}: WaveformChartProps) {
  const [throttledData, setThrottledData] = useState<WaveDataPoint[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const dataBufferRef = useRef<WaveDataPoint[]>([]);

  // RAF-throttled update to prevent frame drops
  // At 60Hz telemetry, we update UI every other frame (~30FPS) for smooth 60FPS rendering
  useEffect(() => {
    dataBufferRef.current = data;

    const updateThrottled = () => {
      const now = performance.now();
      // Update at most every 16.67ms (60FPS), but typically less frequent
      if (now - lastUpdateRef.current >= 16.67) {
        setThrottledData([...dataBufferRef.current]);
        lastUpdateRef.current = now;
      }
      rafRef.current = requestAnimationFrame(updateThrottled);
    };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updateThrottled);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [data]);

  const chartData = useMemo(() => {
    return (throttledData.length > 0 ? throttledData : data).map((p) => ({
      idx: p.index,
      a: mode === "original" ? p.orig_a : p.bal_a,
      b: mode === "original" ? p.orig_b : p.bal_b,
      c: mode === "original" ? p.orig_c : p.bal_c,
    }));
  }, [throttledData, data, mode]);

  return (
    <div
      className={`glass-card waveform-container ${isPanic ? "panic-console" : ""}`}
      style={isPanic ? { animation: "bloomFlash 2s ease-in-out infinite" } : undefined}
    >
      <div className="card-header">
        <span className={`indicator ${indicatorColor}`} />
        <span>{title}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.6rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {throttledData.length === 0 ? "Loading..." : `${throttledData.length} pts`}
        </span>
      </div>
      <div style={{ padding: "8px 8px 4px", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="idx"
              tick={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              domain={[-1.5, 1.5]}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" />
            <Line
              type="monotone"
              dataKey="a"
              stroke="#00f2ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              style={{
                filter: isPanic
                  ? "drop-shadow(0 0 12px rgba(0,242,255,0.8))"
                  : "drop-shadow(0 0 6px rgba(0,242,255,0.6))",
              }}
            />
            <Line
              type="monotone"
              dataKey="b"
              stroke="#ff00cc"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              style={{
                filter: isPanic
                  ? "drop-shadow(0 0 12px rgba(255,0,204,0.8))"
                  : "drop-shadow(0 0 6px rgba(255,0,204,0.6))",
              }}
            />
            <Line
              type="monotone"
              dataKey="c"
              stroke="#ffaa00"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              style={{
                filter: isPanic
                  ? "drop-shadow(0 0 12px rgba(255,170,0,0.8))"
                  : "drop-shadow(0 0 6px rgba(255,170,0,0.6))",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Phase legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          padding: "4px 0 12px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.65rem",
          color: "var(--text-muted)",
        }}
      >
        <span>
          <span style={{ color: "#00f2ff" }}>●</span> Phase A
        </span>
        <span>
          <span style={{ color: "#ff00cc" }}>●</span> Phase B
        </span>
        <span>
          <span style={{ color: "#ffaa00" }}>●</span> Phase C
        </span>
      </div>
    </div>
  );
}
