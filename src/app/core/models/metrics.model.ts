import { AdminAccessRequest } from './access-request.model';
import { AnalysisStatus } from './analysis.model';

export interface LatestAnalysisSummary {
  id: string;
  fieldId: string | null;
  lotName: string;
  status: AnalysisStatus;
  durationMs: number | null;
  createdAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalFields: number;
  totalLots: number;
  totalAnalysis: number;
  completedAnalysis: number;
  failedAnalysis: number;
  averageAnalysisDurationMs: number | null;
  latestAnalysis: LatestAnalysisSummary[];
  latestAccessRequests: AdminAccessRequest[];
}
