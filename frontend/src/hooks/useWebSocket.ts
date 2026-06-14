"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TelemetryFrame, WaveDataPoint, ReasoningEntry } from "@/lib/types";

// Get WebSocket URL from environment variable with fallback for development
const WS_URL = typeof window !== "undefined" 
  ? (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/telemetry")
  : "ws://localhost:8000/ws/telemetry";
const BUFFER_SIZE = 300;
const UI_UPDATE_INTERVAL = 50; // ~20fps for smooth UI without perf issues
const MAX_RECONNECT_ATTEMPTS = 12; // Max ~30 min with exponential backoff
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const MAX_REASONING_LOGS = 50; // Cap accumulated logs

export interface WebSocketState {
  isConnected: boolean;
  waveData: WaveDataPoint[];
  latestFrame: TelemetryFrame | null;
  connectionAttempts: number;
  isPanic: boolean;
  isPreemptiveActive: boolean;
  lastError: string | null;
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    waveData: [],
    latestFrame: null,
    connectionAttempts: 0,
    isPanic: false,
    isPreemptiveActive: false,
    lastError: null,
  });

  // Mutable refs to avoid re-render on every tick
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<WaveDataPoint[]>([]);
  const latestFrameRef = useRef<TelemetryFrame | null>(null);
  const indexRef = useRef(0);
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectedRef = useRef(false);
  const attemptsRef = useRef(0);
  const isPanicRef = useRef(false);
  const isPreemptiveRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  const frameCountRef = useRef(0);
  const accumulatedLogsRef = useRef<ReasoningEntry[]>([]);
  const lastLogTimestampRef = useRef<number>(0);

  // Throttled UI state push
  const pushToState = useCallback(() => {
    setState({
      isConnected: isConnectedRef.current,
      waveData: [...bufferRef.current],
      latestFrame: latestFrameRef.current,
      connectionAttempts: attemptsRef.current,
      isPanic: isPanicRef.current,
      isPreemptiveActive: isPreemptiveRef.current,
      lastError: lastErrorRef.current,
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (attemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
      lastErrorRef.current = "Max reconnection attempts exceeded";
      pushToState();
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        isConnectedRef.current = true;
        attemptsRef.current = 0;
        lastErrorRef.current = null;
        frameCountRef.current = 0;
        pushToState();

        // Start UI update timer
        if (updateTimerRef.current) clearInterval(updateTimerRef.current);
        updateTimerRef.current = setInterval(pushToState, UI_UPDATE_INTERVAL);

        // Start heartbeat monitor
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setInterval(() => {
          if (frameCountRef.current === 0) {
            console.warn("⚠️ No frames received for 5s, closing stale connection");
            ws.close();
          }
          frameCountRef.current = 0;
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        frameCountRef.current++;
        try {
          const frame: TelemetryFrame = JSON.parse(event.data);
          
          // ── Accumulate reasoning logs (don't replace) ──────
          const incomingLogs = frame.agent_status?.reasoning_log ?? [];
          for (const log of incomingLogs) {
            // Only add if this is a new log entry (by timestamp)
            if (log.timestamp > lastLogTimestampRef.current) {
              accumulatedLogsRef.current.push(log);
              lastLogTimestampRef.current = log.timestamp;
            }
          }
          
          // Keep accumulated logs capped at MAX_REASONING_LOGS
          if (accumulatedLogsRef.current.length > MAX_REASONING_LOGS) {
            accumulatedLogsRef.current = accumulatedLogsRef.current.slice(-MAX_REASONING_LOGS);
          }
          
          // Update frame with accumulated logs
          if (frame.agent_status) {
            frame.agent_status.reasoning_log = accumulatedLogsRef.current;
          }
          
          latestFrameRef.current = frame;

          // Track panic state
          isPanicRef.current = frame.is_panic || false;
          isPreemptiveRef.current = frame.preemptive_adaptation || false;

          // Push to ring buffer
          const point: WaveDataPoint = {
            index: indexRef.current++,
            orig_a: frame.original_wave.a,
            orig_b: frame.original_wave.b,
            orig_c: frame.original_wave.c,
            bal_a: frame.balanced_wave.a,
            bal_b: frame.balanced_wave.b,
            bal_c: frame.balanced_wave.c,
          };

          bufferRef.current.push(point);
          if (bufferRef.current.length > BUFFER_SIZE) {
            bufferRef.current = bufferRef.current.slice(-BUFFER_SIZE);
          }
        } catch (err) {
          lastErrorRef.current = `Frame parse error: ${err instanceof Error ? err.message : String(err)}`;
          console.error("❌ Frame parsing error:", err);
        }
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        isConnectedRef.current = false;
        isPanicRef.current = false;
        isPreemptiveRef.current = false;
        accumulatedLogsRef.current = []; // Reset accumulated logs on disconnect
        lastLogTimestampRef.current = 0;
        if (updateTimerRef.current) {
          clearInterval(updateTimerRef.current);
          updateTimerRef.current = null;
        }
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        pushToState();

        // Reconnect with exponential backoff
        attemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current - 1), 30000);
        console.log(`📡 Reconnecting in ${delay}ms (attempt ${attemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (event) => {
        lastErrorRef.current = "WebSocket error occurred";
        console.error("❌ WebSocket error:", event);
        ws.close();
      };
    } catch (err) {
      lastErrorRef.current = err instanceof Error ? err.message : String(err);
      console.error("❌ Connection error:", err);
      attemptsRef.current++;
      const delay = Math.min(1000 * Math.pow(2, attemptsRef.current - 1), 30000);
      reconnectTimerRef.current = setTimeout(connect, delay);
    }
  }, [pushToState]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  return state;
}
