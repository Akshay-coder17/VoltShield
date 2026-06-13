"""
VoltShield AI — Controller Agent
Plan-Act-Reflect agentic loop with recursive learning.
"""

import time
import math
from dataclasses import dataclass, field
from typing import Optional
from models import (
    AgentState, AgentStrategy, ReasoningEntry,
    PreemptiveStrategy, AgentStatus, LearningMetric,
)


# ─── Anomaly History Record ──────────────────────────────────────

@dataclass
class AnomalyRecord:
    anomaly_type: str
    severity: float
    response_time_ms: float
    residual_error: float
    timestamp: float = field(default_factory=time.time)


# ─── Controller Agent ────────────────────────────────────────────

class ControllerAgent:
    """
    Multi-stage controller implementing Plan-Act-Reflect with recursive learning.
    
    The agent:
    1. PLAN — Detects anomalies by comparing raw vs ideal wave, classifies type and severity
    2. ACT  — Applies corrective actions (capacitor boost, battery buffer, phase realignment)
    3. REFLECT — Compares stabilized wave to ideal, adjusts internal weights for future improvement
    
    After 3+ occurrences of the same anomaly, generates pre-emptive strategies.
    """

    PREEMPTIVE_THRESHOLD = 3  # anomaly occurrences before pre-emptive mode

    def __init__(self):
        # ── Internal weights (learned parameters) ─────────────
        self.weights = {
            "capacitor_gain": 1.0,        # multiplier for voltage sag correction
            "harmonic_damping": 1.0,      # multiplier for harmonic suppression
            "phase_realign_rate": 1.0,    # multiplier for phase correction speed
            "response_speed": 1.0,        # overall response speed factor
        }

        # ── State tracking ────────────────────────────────────
        self.state: AgentState = AgentState.MONITORING
        self.current_strategy: AgentStrategy = AgentStrategy.IDLE
        self.current_anomaly_type: Optional[str] = None
        self.reasoning_log: list[ReasoningEntry] = []

        # ── Learning metrics ──────────────────────────────────
        self.total_anomalies_handled: int = 0
        self.cumulative_error: float = 0.0
        self.error_history: list[float] = []
        self.response_times: list[float] = []

        # ── Anomaly pattern history ───────────────────────────
        self.anomaly_history: dict[str, list[AnomalyRecord]] = {}
        self.preemptive_strategies: dict[str, PreemptiveStrategy] = {}

        # ── Timing ────────────────────────────────────────────
        self._action_start: float = 0.0

    # ─── PLAN ─────────────────────────────────────────────────

    def plan(self, original: dict, ideal: dict, active_anomalies: list[str]) -> dict:
        """
        Analyze incoming telemetry, classify anomaly, choose strategy.
        Returns planning context for the act phase.
        """
        self.state = AgentState.PLANNING
        self._action_start = time.time()

        # Compute per-phase error
        errors = {
            phase: abs(original[phase] - ideal[phase])
            for phase in ["a", "b", "c"]
        }
        total_error = sum(errors.values())
        max_error_phase = max(errors, key=errors.get)
        max_error = errors[max_error_phase]

        # Determine anomaly classification
        detected_type = None
        severity = 0.0

        if active_anomalies:
            detected_type = active_anomalies[0]  # primary anomaly
            severity = min(max_error / 0.6, 1.0)  # normalize
        elif total_error > 0.05:
            # Residual or unknown anomaly
            detected_type = "unknown"
            severity = min(total_error / 1.0, 1.0)

        self.current_anomaly_type = detected_type

        # Choose strategy based on severity and type
        if detected_type is None:
            strategy = AgentStrategy.IDLE
            self._log("plan", "All phases nominal. Grid stable. Monitoring...")
        elif severity > 0.6 or detected_type == "panic":
            strategy = AgentStrategy.HIGH_SPEED_BALANCING
            self._log("plan",
                f"⚡ CRITICAL: {detected_type.replace('_', ' ').upper()} detected on Phase {max_error_phase.upper()}. "
                f"Severity: {severity:.0%}. Deploying HIGH-SPEED BALANCING.")
        else:
            strategy = AgentStrategy.LONG_TERM_THROTTLING
            self._log("plan",
                f"⚠ MODERATE: {detected_type.replace('_', ' ').upper()} on Phase {max_error_phase.upper()}. "
                f"Severity: {severity:.0%}. Engaging LONG-TERM THROTTLING.")

        # Check pre-emptive strategies
        if detected_type and detected_type in self.preemptive_strategies:
            strategy = AgentStrategy.PREEMPTIVE
            ps = self.preemptive_strategies[detected_type]
            self._log("plan",
                f"🧠 PRE-EMPTIVE MODE: Pattern recognized ({ps.occurrences} prior events). "
                f"Applying adapted gain: {ps.adapted_gain:.3f}")

        self.current_strategy = strategy

        return {
            "errors": errors,
            "total_error": total_error,
            "max_error_phase": max_error_phase,
            "detected_type": detected_type,
            "severity": severity,
            "strategy": strategy,
        }

    # ─── ACT ──────────────────────────────────────────────────

    def act(self, original: dict, ideal: dict, plan_ctx: dict) -> dict:
        """
        Apply corrective actions to produce a stabilized (balanced) wave.
        """
        self.state = AgentState.ACTING
        balanced = dict(original)

        if plan_ctx["strategy"] == AgentStrategy.IDLE:
            return balanced

        detected_type = plan_ctx["detected_type"]
        severity = plan_ctx["severity"]

        for phase in ["a", "b", "c"]:
            error = original[phase] - ideal[phase]

            if detected_type == "voltage_sag":
                # Capacitive boost: inject reactive power proportional to sag depth
                gain = self.weights["capacitor_gain"]
                # Check for pre-emptive gain
                if detected_type in self.preemptive_strategies:
                    gain = self.preemptive_strategies[detected_type].adapted_gain
                correction = error * gain * self.weights["response_speed"]
                balanced[phase] = original[phase] - correction * 0.85

            elif detected_type == "harmonic_spike":
                # Harmonic dampening: suppress high-frequency components
                gain = self.weights["harmonic_damping"]
                if detected_type in self.preemptive_strategies:
                    gain = self.preemptive_strategies[detected_type].adapted_gain
                correction = error * gain * self.weights["response_speed"]
                balanced[phase] = original[phase] - correction * 0.80

            elif detected_type == "phase_imbalance":
                # Phase realignment: blend toward ideal
                rate = self.weights["phase_realign_rate"]
                if detected_type in self.preemptive_strategies:
                    rate = self.preemptive_strategies[detected_type].adapted_gain
                correction = error * rate * self.weights["response_speed"]
                balanced[phase] = original[phase] - correction * 0.75

            else:
                # General correction for unknown/panic
                correction = error * self.weights["response_speed"]
                balanced[phase] = original[phase] - correction * 0.70

            balanced[phase] = round(balanced[phase], 6)

        action_desc = {
            "voltage_sag": f"Capacitive boost applied (gain={self.weights['capacitor_gain']:.3f})",
            "harmonic_spike": f"Harmonic filter engaged (damping={self.weights['harmonic_damping']:.3f})",
            "phase_imbalance": f"Phase realignment active (rate={self.weights['phase_realign_rate']:.3f})",
        }
        msg = action_desc.get(detected_type, f"General stabilization active")
        self._log("act", f"🔧 {msg}. Correcting {plan_ctx['max_error_phase'].upper()} phase.")

        return balanced

    # ─── MOVING AVERAGE ERROR TRACKER ───────────────────────

    def __init__(self):
        # ── Internal weights (learned parameters) ─────────────
        self.weights = {
            "capacitor_gain": 1.0,        # multiplier for voltage sag correction
            "harmonic_damping": 1.0,      # multiplier for harmonic suppression
            "phase_realign_rate": 1.0,    # multiplier for phase correction speed
            "response_speed": 1.0,        # overall response speed factor
        }

        # ── State tracking ────────────────────────────────────
        self.state: AgentState = AgentState.MONITORING
        self.current_strategy: AgentStrategy = AgentStrategy.IDLE
        self.current_anomaly_type: Optional[str] = None
        self.reasoning_log: list[ReasoningEntry] = []

        # ── Learning metrics ──────────────────────────────────
        self.total_anomalies_handled: int = 0
        self.cumulative_error: float = 0.0
        self.error_history: list[float] = []
        self.response_times: list[float] = []
        self.moving_avg_window: list[float] = []  # Moving average of recent errors
        self.moving_avg_size: int = 10              # 10-tick window

        # ── Anomaly pattern history ───────────────────────────
        self.anomaly_history: dict[str, list[AnomalyRecord]] = {}
        self.preemptive_strategies: dict[str, PreemptiveStrategy] = {}
        self.preemptive_triggers: dict[str, bool] = {}  # Track broadcast state

        # ── Timing ────────────────────────────────────────────
        self._action_start: float = 0.0

    # ─── REFLECT ──────────────────────────

    def reflect(self, balanced: dict, ideal: dict, plan_ctx: dict):
        """
        Compare stabilized wave to ideal. Adjust internal weights.
        This is the core of the recursive learning loop with Moving-Average Error Correction.
        """
        self.state = AgentState.REFLECTING

        # Compute residual error after correction
        residual_errors = {
            phase: abs(balanced[phase] - ideal[phase])
            for phase in ["a", "b", "c"]
        }
        residual_total = sum(residual_errors.values())

        # ── MOVING-AVERAGE ERROR CORRECTION ──────────────────
        # Maintain a sliding window of recent errors
        self.moving_avg_window.append(residual_total)
        if len(self.moving_avg_window) > self.moving_avg_size:
            self.moving_avg_window.pop(0)
        
        moving_avg_error = sum(self.moving_avg_window) / len(self.moving_avg_window)
        error_delta = residual_total - moving_avg_error  # deviation from trend
        
        # If current error deviates significantly, apply dynamic correction
        if abs(error_delta) > 0.05:
            # Error is spiking or dipping unexpectedly
            for phase in ["a", "b", "c"]:
                if residual_errors[phase] > moving_avg_error * 1.3:
                    # Apply phase-specific correction
                    self.weights["response_speed"] = min(
                        self.weights["response_speed"] * 1.08,  # Increase speed by 8%
                        2.5
                    )
                    self._log("reflect",
                        f"🔄 MOVING-AVG CORRECTION: Phase {phase.upper()} error spike detected. "
                        f"Current={residual_errors[phase]:.4f}, MA={moving_avg_error:.4f}. "
                        f"Response speed boosted to {self.weights['response_speed']:.3f}.")

        # Response time
        response_time_ms = (time.time() - self._action_start) * 1000
        self.response_times.append(response_time_ms)

        detected_type = plan_ctx["detected_type"]
        if detected_type and detected_type != "unknown":
            self.total_anomalies_handled += 1

            # ── Record to anomaly history ─────────────────────
            record = AnomalyRecord(
                anomaly_type=detected_type,
                severity=plan_ctx["severity"],
                response_time_ms=response_time_ms,
                residual_error=residual_total,
            )
            if detected_type not in self.anomaly_history:
                self.anomaly_history[detected_type] = []
            self.anomaly_history[detected_type].append(record)

            # ── Weight adjustment (gradient-free learning) ────
            # If residual error is high, increase correction gains
            learning_rate = 0.05
            if residual_total > 0.1:
                adjustment = learning_rate * min(residual_total, 0.5)
                if detected_type == "voltage_sag":
                    self.weights["capacitor_gain"] += adjustment
                    self.weights["capacitor_gain"] = min(self.weights["capacitor_gain"], 3.0)
                elif detected_type == "harmonic_spike":
                    self.weights["harmonic_damping"] += adjustment
                    self.weights["harmonic_damping"] = min(self.weights["harmonic_damping"], 3.0)
                elif detected_type == "phase_imbalance":
                    self.weights["phase_realign_rate"] += adjustment
                    self.weights["phase_realign_rate"] = min(self.weights["phase_realign_rate"], 3.0)

                self._log("reflect",
                    f"📊 Residual error: {residual_total:.4f}. Response: {response_time_ms:.1f}ms. "
                    f"Adjusting gains ↑ by {adjustment:.4f}.")
            elif residual_total > 0.01:
                self._log("reflect",
                    f"📊 Residual error: {residual_total:.4f}. Response: {response_time_ms:.1f}ms. "
                    f"Correction adequate — maintaining weights.")
            else:
                # Slight decrease if over-correcting
                decay = learning_rate * 0.1
                for key in ["capacitor_gain", "harmonic_damping", "phase_realign_rate"]:
                    self.weights[key] = max(0.5, self.weights[key] - decay)
                self._log("reflect",
                    f"✅ Near-perfect correction (error={residual_total:.4f}). "
                    f"Relaxing gains slightly to prevent overshoot.")

            # ── Response speed adaptation ─────────────────────
            if len(self.response_times) > 5:
                recent_avg = sum(self.response_times[-5:]) / 5
                if recent_avg > 2.0:
                    self.weights["response_speed"] = min(
                        self.weights["response_speed"] + 0.02, 2.0
                    )
                    self._log("reflect",
                        f"⏱ Avg response {recent_avg:.1f}ms — accelerating response speed.")

            # ── Pre-emptive strategy generation ───────────────
            self._check_preemptive(detected_type)

        # Track cumulative learning
        self.cumulative_error += residual_total
        self.error_history.append(residual_total)

        # Return to monitoring
        if not plan_ctx.get("strategy") == AgentStrategy.IDLE:
            self.state = AgentState.MONITORING

    # ─── HELPER: Get Preemptive Adaptation Flag ──────────────

    def get_preemptive_adaptation_flag(self) -> bool:
        """
        Check if any anomaly type has triggered pre-emptive adaptation.
        Used by WebSocket to broadcast PREEMPTIVE_ADAPTATION flag.
        """
        return any(self.preemptive_triggers.values())

    # ─── PRE-EMPTIVE STRATEGY CHECK ──────────────────────────

    def _check_preemptive(self, anomaly_type: str):
        """
        After PREEMPTIVE_THRESHOLD occurrences, generate a pre-emptive strategy.
        Broadcasts PREEMPTIVE_ADAPTATION flag when activated.
        """
        history = self.anomaly_history.get(anomaly_type, [])
        if len(history) < self.PREEMPTIVE_THRESHOLD:
            # Not enough occurrences yet
            self.preemptive_triggers[anomaly_type] = False
            return

        if anomaly_type in self.preemptive_strategies:
            # Update existing strategy
            recent = history[-self.PREEMPTIVE_THRESHOLD:]
            avg_severity = sum(r.severity for r in recent) / len(recent)
            avg_error = sum(r.residual_error for r in recent) / len(recent)

            # Adaptive gain: increase if errors are still high
            current_gain = self.preemptive_strategies[anomaly_type].adapted_gain
            if avg_error > 0.1:
                new_gain = min(current_gain + 0.1, 3.0)
            else:
                new_gain = max(current_gain - 0.02, 0.8)

            self.preemptive_strategies[anomaly_type].adapted_gain = new_gain
            self.preemptive_strategies[anomaly_type].occurrences = len(history)
            self.preemptive_strategies[anomaly_type].avg_severity = round(avg_severity, 3)
            
            # Flag that preemptive adaptation is active
            self.preemptive_triggers[anomaly_type] = True
            return

        # Generate new pre-emptive strategy
        recent = history[-self.PREEMPTIVE_THRESHOLD:]
        avg_severity = sum(r.severity for r in recent) / len(recent)
        avg_response = sum(r.response_time_ms for r in recent) / len(recent)

        # Pre-compute an optimized gain
        adapted_gain = self.weights.get(
            {"voltage_sag": "capacitor_gain",
             "harmonic_spike": "harmonic_damping",
             "phase_imbalance": "phase_realign_rate"}.get(anomaly_type, "response_speed"),
            1.0
        ) * 1.15  # 15% boost for pre-emptive response

        strategy = PreemptiveStrategy(
            anomaly_type=anomaly_type,
            occurrences=len(history),
            avg_severity=round(avg_severity, 3),
            adapted_gain=round(adapted_gain, 3),
            message=(
                f"🧠 PATTERN DETECTED: {anomaly_type.replace('_', ' ').title()} "
                f"has occurred {len(history)} times (avg severity: {avg_severity:.0%}). "
                f"Pre-emptive response calibrated with {adapted_gain:.1f}x gain boost. "
                f"Avg response: {avg_response:.1f}ms."
            ),
        )
        self.preemptive_strategies[anomaly_type] = strategy
        self.preemptive_triggers[anomaly_type] = True  # ACTIVATE BROADCAST FLAG
        
        self._log("reflect",
            f"🧠 NEW PRE-EMPTIVE STRATEGY: Recognized {anomaly_type} pattern. "
            f"Adapted gain set to {adapted_gain:.3f} for instant response. "
            f"PREEMPTIVE_ADAPTATION flag broadcast ACTIVE.")

    # ─── FULL AGENT LOOP ─────────────────────────────────────

    def process(self, original: dict, ideal: dict, active_anomalies: list[str]) -> dict:
        """
        Run the full Plan-Act-Reflect loop on one telemetry tick.
        Returns the balanced wave.
        """
        # Trim reasoning log to last 50 entries
        if len(self.reasoning_log) > 50:
            self.reasoning_log = self.reasoning_log[-30:]

        plan_ctx = self.plan(original, ideal, active_anomalies)
        balanced = self.act(original, ideal, plan_ctx)
        self.reflect(balanced, ideal, plan_ctx)

        return balanced

    # ─── STATUS GETTERS ──────────────────────────────────────

    def get_status(self) -> AgentStatus:
        """Get current agent status for telemetry broadcast."""
        # Find active preemptive strategy for current anomaly
        active_preemptive = None
        if self.current_anomaly_type and self.current_anomaly_type in self.preemptive_strategies:
            active_preemptive = self.preemptive_strategies[self.current_anomaly_type]
        elif self.preemptive_strategies:
            # Show the most recent one
            active_preemptive = list(self.preemptive_strategies.values())[-1]

        return AgentStatus(
            state=self.state,
            anomaly_type=self.current_anomaly_type,
            strategy=self.current_strategy,
            reasoning_log=self.reasoning_log[-10:],  # last 10 entries
            preemptive_strategy=active_preemptive,
        )

    def get_learning_metric(self) -> LearningMetric:
        """Get current learning metrics."""
        # Grid health: inverse of recent average error
        recent_errors = self.error_history[-60:] if self.error_history else [0]
        avg_recent_error = sum(recent_errors) / len(recent_errors)
        grid_health = max(0.0, min(1.0, 1.0 - avg_recent_error * 2))

        # Learning progress: based on weight divergence from defaults + anomaly count
        weight_changes = sum(abs(v - 1.0) for v in self.weights.values())
        learning_progress = min(1.0, (weight_changes / 4.0) * 0.5 +
                               min(self.total_anomalies_handled / 20, 1.0) * 0.5)

        # Response improvement
        if len(self.response_times) > 10:
            first_five = sum(self.response_times[:5]) / 5
            last_five = sum(self.response_times[-5:]) / 5
            improvement = max(0, (first_five - last_five) / first_five) if first_five > 0 else 0
        else:
            improvement = 0.0

        return LearningMetric(
            grid_health=round(grid_health, 4),
            learning_progress=round(learning_progress, 4),
            total_anomalies_handled=self.total_anomalies_handled,
            avg_response_improvement=round(improvement, 4),
            cumulative_error=round(self.cumulative_error, 4),
        )

    # ─── HELPERS ─────────────────────────────────────────────

    def _log(self, step: str, message: str):
        self.reasoning_log.append(ReasoningEntry(
            step=step,
            message=message,
            timestamp=time.time(),
        ))
