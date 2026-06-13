"""
VoltShield AI — 3-Phase Power Wave Simulator
High-frequency (60Hz) sine wave generator with injectable anomalies.
"""

import time
import math
import numpy as np
from typing import Optional
from dataclasses import dataclass, field
from models import AnomalyType


# ─── Anomaly Event ────────────────────────────────────────────────

@dataclass
class AnomalyEvent:
    anomaly_type: AnomalyType
    severity: float             # 0.0 to 1.0
    target_phase: str           # "a", "b", or "c"
    duration_cycles: int        # number of cycles
    remaining_cycles: int = 0   # countdown
    triggered_at: float = 0.0

    def __post_init__(self):
        self.remaining_cycles = self.duration_cycles
        self.triggered_at = time.time()


# ─── Anomaly Generator ───────────────────────────────────────────

class AnomalyGenerator:
    """Generates controlled power quality distortions on the 3-phase wave."""

    def __init__(self):
        self.active_anomalies: list[AnomalyEvent] = []
        self._panic_mode = False

    def trigger(self, anomaly_type: AnomalyType, severity: float = 0.5,
                target_phase: str = "b", duration_cycles: int = 30):
        """Queue a new anomaly event."""
        event = AnomalyEvent(
            anomaly_type=anomaly_type,
            severity=severity,
            target_phase=target_phase,
            duration_cycles=duration_cycles,
        )
        self.active_anomalies.append(event)

    def trigger_panic(self):
        """Trigger simultaneous multi-anomaly cascade across all phases."""
        self._panic_mode = True
        # Voltage sag on phase A
        self.trigger(AnomalyType.VOLTAGE_SAG, severity=0.8, target_phase="a", duration_cycles=60)
        # Harmonic spike on phase B
        self.trigger(AnomalyType.HARMONIC_SPIKE, severity=0.9, target_phase="b", duration_cycles=60)
        # Phase imbalance on phase C
        self.trigger(AnomalyType.PHASE_IMBALANCE, severity=0.7, target_phase="c", duration_cycles=60)

    @property
    def is_panic(self) -> bool:
        return self._panic_mode

    def apply(self, phases: dict[str, float], t: float) -> dict[str, float]:
        """Apply all active anomalies to the raw phase voltages."""
        result = dict(phases)
        expired = []

        for i, event in enumerate(self.active_anomalies):
            if event.remaining_cycles <= 0:
                expired.append(i)
                continue

            event.remaining_cycles -= 1
            target = event.target_phase

            if event.anomaly_type == AnomalyType.VOLTAGE_SAG:
                # Drop amplitude by severity * 60%
                sag_factor = 1.0 - (event.severity * 0.6)
                result[target] *= sag_factor

            elif event.anomaly_type == AnomalyType.HARMONIC_SPIKE:
                # Inject 3rd, 5th, and 7th harmonics
                freq = 60.0
                h3 = event.severity * 0.25 * math.sin(3 * 2 * math.pi * freq * t)
                h5 = event.severity * 0.15 * math.sin(5 * 2 * math.pi * freq * t)
                h7 = event.severity * 0.10 * math.sin(7 * 2 * math.pi * freq * t)
                result[target] += h3 + h5 + h7

            elif event.anomaly_type == AnomalyType.PHASE_IMBALANCE:
                # Shift phase angle — approximate by mixing in adjacent phase
                shift = event.severity * 0.3
                other_phases = [p for p in ["a", "b", "c"] if p != target]
                result[target] = result[target] * (1 - shift) + result[other_phases[0]] * shift

        # Remove expired anomalies (reverse to preserve indices)
        for i in sorted(expired, reverse=True):
            self.active_anomalies.pop(i)

        # Clear panic mode when all anomalies expire
        if self._panic_mode and len(self.active_anomalies) == 0:
            self._panic_mode = False

        return result

    @property
    def has_active_anomalies(self) -> bool:
        return len(self.active_anomalies) > 0

    def get_active_types(self) -> list[str]:
        return list(set(e.anomaly_type.value for e in self.active_anomalies if e.remaining_cycles > 0))


# ─── 3-Phase Wave Simulator ──────────────────────────────────────

class WaveSimulator:
    """
    Generates a 60Hz 3-phase sine wave.
    Phase A, B, C are offset by 120° (2π/3 radians).
    """

    FREQUENCY = 60.0                          # Hz
    AMPLITUDE = 1.0                           # Normalized peak voltage
    PHASE_OFFSETS = {
        "a": 0.0,
        "b": 2.0 * math.pi / 3.0,            # 120°
        "c": 4.0 * math.pi / 3.0,            # 240°
    }

    def __init__(self):
        self.anomaly_gen = AnomalyGenerator()
        self.start_time = time.time()
        self.tick_count = 0

    def get_ideal_wave(self, t: float) -> dict[str, float]:
        """Generate ideal 3-phase voltages at time t."""
        omega = 2.0 * math.pi * self.FREQUENCY
        return {
            phase: round(self.AMPLITUDE * math.sin(omega * t + offset), 6)
            for phase, offset in self.PHASE_OFFSETS.items()
        }

    def tick(self) -> dict:
        """
        Produce one simulation tick.
        Returns raw (possibly anomalous) wave + ideal wave + timing.
        """
        self.tick_count += 1
        t = time.time() - self.start_time

        # Ideal (reference) wave
        ideal = self.get_ideal_wave(t)

        # Raw wave starts as ideal, then anomalies are applied
        raw = dict(ideal)
        if self.anomaly_gen.has_active_anomalies:
            raw = self.anomaly_gen.apply(raw, t)

        return {
            "timestamp": time.time(),
            "t": t,
            "original_wave": raw,
            "ideal_wave": ideal,
            "active_anomalies": self.anomaly_gen.get_active_types(),
            "is_panic": self.anomaly_gen.is_panic,
        }
