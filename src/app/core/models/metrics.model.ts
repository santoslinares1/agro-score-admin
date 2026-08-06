import { AccessRequestStatus, AdminAccessRequest } from './access-request.model';
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

  // ADMIN-2: todos opcionales a propósito — si el backend que responde es
  // más viejo que esta versión del frontend (o algún campo puntual no viene
  // por lo que sea), la pantalla no debe romper, solo mostrar 0/"No
  // disponible" según corresponda (ver DashboardComponent).
  usersCreatedLast7Days?: number;
  usersCreatedLast30Days?: number;
  fieldsCreatedLast7Days?: number;
  fieldsCreatedLast30Days?: number;
  analysisCreatedLast7Days?: number;
  analysisCreatedLast30Days?: number;
  failedAnalysisLast7Days?: number;
  failedAnalysisLast30Days?: number;
  usersWithNoAnalysis?: number;
  fieldsWithNoAnalysis?: number;
  accessRequestsByStatus?: Partial<Record<AccessRequestStatus, number>>;
  // Fracción 0–1, no porcentaje — se formatea en el template.
  analysisFailureRateLast7Days?: number;
  averageAnalysisDurationMsLast7Days?: number | null;
}
