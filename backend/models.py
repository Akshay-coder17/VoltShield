"""
VoltShield AI — Pydantic Models
Telemetry payload schemas for WebSocket and REST communication.
"""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AnomalyType(str, Enum):
    VOLTAGE_SAG = "voltage_sag"
    HARMONIC_SPIKE = "harmonic_spike"
    PHASE_IMBALANCE = "phase_imbalance"
    PANIC = "panic"


class AgentStrategy(str, Enum):
    HIGH_SPEED_BALANCING = "high_speed_balancing"
    LONG_TERM_THROTTLING = "long_term_throttling"
    IDLE = "idle"
    PREEMPTIVE = "preemptive"


class AgentState(str, Enum):
    MONITORING = "monitoring"
    PLANNING = "planning"
    ACTING = "acting"
    REFLECTING = "reflecting"
    PREEMPTIVE = "preemptive"


# ─── Request Models ───────────────────────────────────────────────

class AnomalyTriggerRequest(BaseModel):
    anomaly_type: AnomalyType
    severity: float = 0.5        # 0.0 to 1.0
    target_phase: str = "b"      # a, b, or c
    duration_cycles: int = 30    # how many cycles the anomaly lasts


# ─── Wave Data ────────────────────────────────────────────────────

class ThreePhasePoint(BaseModel):
    a: float
    b: float
    c: float


# ─── Agent Reasoning Log ─────────────────────────────────────────

class ReasoningEntry(BaseModel):
    step: str           # "plan", "act", "reflect"
    message: str
    timestamp: float


# ─── Pre-emptive Strategy ────────────────────────────────────────

class PreemptiveStrategy(BaseModel):
    anomaly_type: str
    occurrences: int
    avg_severity: float
    adapted_gain: float
    message: str


# ─── Agent Status Block ──────────────────────────────────────────

class AgentStatus(BaseModel):
    state: AgentState
    anomaly_type: Optional[str] = None
    strategy: AgentStrategy
    reasoning_log: list[ReasoningEntry] = []
    preemptive_strategy: Optional[PreemptiveStrategy] = None


# ─── Learning Metrics ────────────────────────────────────────────

class LearningMetric(BaseModel):
    grid_health: float                  # 0.0 - 1.0
    learning_progress: float            # 0.0 - 1.0
    total_anomalies_handled: int
    avg_response_improvement: float     # percentage
    cumulative_error: float


# ─── Full Telemetry Frame (WebSocket payload) ────────────────────

class TelemetryFrame(BaseModel):
    timestamp: float
    original_wave: ThreePhasePoint
    balanced_wave: ThreePhasePoint
    ideal_wave: ThreePhasePoint
    agent_status: AgentStatus
    learning_metric: LearningMetric
