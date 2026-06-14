// VoltShield AI — TypeScript Type Definitions

export interface ThreePhasePoint {
  a: number;
  b: number;
  c: number;
}

export interface ReasoningEntry {
  step: "plan" | "act" | "reflect";
  message: string;
  timestamp: number;
}

export interface PreemptiveStrategy {
  anomaly_type: string;
  occurrences: number;
  avg_severity: number;
  adapted_gain: number;
  message: string;
}

export interface AgentStatus {
  state: "monitoring" | "planning" | "acting" | "reflecting" | "preemptive";
  anomaly_type: string | null;
  strategy: "high_speed_balancing" | "long_term_throttling" | "idle" | "preemptive";
  reasoning_log: ReasoningEntry[];
  preemptive_strategy: PreemptiveStrategy | null;
}

export interface LearningMetric {
  grid_health: number;
  learning_progress: number;
  total_anomalies_handled: number;
  avg_response_improvement: number;
  cumulative_error: number;
}

export interface TelemetryFrame {
  timestamp: number;
  original_wave: ThreePhasePoint;
  balanced_wave: ThreePhasePoint;
  ideal_wave: ThreePhasePoint;
  agent_status: AgentStatus;
  learning_metric: LearningMetric;
  preemptive_adaptation: boolean;  // NEW: Flag for preemptive mode active
  is_panic: boolean;                 // NEW: Panic mode indicator
}

// Ring buffer data point for charts
export interface WaveDataPoint {
  index: number;
  orig_a: number;
  orig_b: number;
  orig_c: number;
  bal_a: number;
  bal_b: number;
  bal_c: number;
}
