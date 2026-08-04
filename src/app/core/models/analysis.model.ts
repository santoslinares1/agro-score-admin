// Los valores de status se mantienen en español, igual que el backend
// (agro-score-api mantuvo el sistema de estados existente sin migrarlo a
// inglés — ver docs/admin-backend.md en agro-score-api).
export type AnalysisStatus = 'Procesando' | 'Finalizado' | 'Error';

export interface AdminAnalysis {
  id: string;
  fieldId: string | null;
  fieldName: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
  status: AnalysisStatus;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}
