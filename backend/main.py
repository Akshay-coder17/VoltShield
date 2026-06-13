"""
VoltShield AI — FastAPI Server
WebSocket telemetry stream + REST anomaly control endpoints.
"""

import asyncio
import time
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from simulator import WaveSimulator
from agent import ControllerAgent
from models import AnomalyTriggerRequest, AnomalyType


# ─── Shared State ─────────────────────────────────────────────────

simulator = WaveSimulator()
agent = ControllerAgent()


# ─── App Lifecycle ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("⚡ VoltShield AI Engine starting...")
    print(f"   Simulator frequency: {simulator.FREQUENCY}Hz")
    print(f"   Agent weights: {agent.weights}")
    yield
    print("⚡ VoltShield AI Engine shutting down.")


app = FastAPI(
    title="VoltShield AI",
    description="Industrial Power Quality Digital Twin — Agentic Engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── WebSocket Telemetry Stream ───────────────────────────────────

@app.websocket("/ws/telemetry")
async def telemetry_stream(websocket: WebSocket):
    """
    High-frequency WebSocket endpoint.
    Streams telemetry at ~60Hz (one frame per power cycle).
    """
    await websocket.accept()
    print("🔌 Client connected to telemetry stream")

    try:
        while True:
            # Generate one simulation tick
            tick = simulator.tick()

            # Run agent loop: Plan → Act → Reflect
            balanced = agent.process(
                original=tick["original_wave"],
                ideal=tick["ideal_wave"],
                active_anomalies=tick["active_anomalies"],
            )

            # Build telemetry frame
            frame = {
                "timestamp": tick["timestamp"],
                "original_wave": tick["original_wave"],
                "balanced_wave": balanced,
                "ideal_wave": tick["ideal_wave"],
                "agent_status": agent.get_status().model_dump(),
                "learning_metric": agent.get_learning_metric().model_dump(),
                "preemptive_adaptation": agent.get_preemptive_adaptation_flag(),
                "is_panic": tick["is_panic"],
            }

            await websocket.send_json(frame)

            # ~60Hz tick rate (16.67ms per frame)
            await asyncio.sleep(1.0 / 60.0)

    except WebSocketDisconnect:
        print("🔌 Client disconnected from telemetry stream")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")


# ─── REST API Endpoints ──────────────────────────────────────────

@app.post("/api/anomaly/trigger")
async def trigger_anomaly(request: AnomalyTriggerRequest):
    """Trigger a specific anomaly type on the simulator."""
    simulator.anomaly_gen.trigger(
        anomaly_type=request.anomaly_type,
        severity=request.severity,
        target_phase=request.target_phase,
        duration_cycles=request.duration_cycles,
    )
    return {
        "status": "triggered",
        "anomaly_type": request.anomaly_type.value,
        "severity": request.severity,
        "target_phase": request.target_phase,
        "duration_cycles": request.duration_cycles,
    }


@app.post("/api/anomaly/panic")
async def trigger_panic():
    """Trigger simultaneous multi-anomaly cascade across all phases."""
    simulator.anomaly_gen.trigger_panic()
    return {
        "status": "panic_triggered",
        "message": "⚠️ PANIC MODE: Multi-anomaly cascade initiated across all phases!",
    }


@app.get("/api/agent/status")
async def get_agent_status():
    """Get current agent state and learning metrics."""
    return {
        "agent_status": agent.get_status().model_dump(),
        "learning_metric": agent.get_learning_metric().model_dump(),
        "weights": agent.weights,
        "preemptive_strategies": {
            k: v.model_dump() for k, v in agent.preemptive_strategies.items()
        },
        "anomaly_history_counts": {
            k: len(v) for k, v in agent.anomaly_history.items()
        },
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "engine": "VoltShield AI v1.0.0",
        "uptime": time.time() - simulator.start_time,
        "ticks": simulator.tick_count,
    }


# ─── Entry Point ─────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
