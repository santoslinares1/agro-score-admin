export type HealthStatus = 'ok' | 'error' | 'unreachable' | 'not_checked';

export interface SystemHealthCheck {
  status: HealthStatus;
  error?: string;
  note?: string;
}

export interface AnalysisHealthSummary {
  id: string;
  fieldId: string | null;
  lotName: string;
  completedAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface SystemHealth {
  api: SystemHealthCheck;
  db: SystemHealthCheck;
  worker: SystemHealthCheck;
  earthEngine: SystemHealthCheck;
  lastSuccessfulAnalysis: AnalysisHealthSummary | null;
  lastFailedAnalysis: AnalysisHealthSummary | null;
  currentBackendCommit: string | null;
  uptimeSeconds: number;
  timestamp: string;
}
