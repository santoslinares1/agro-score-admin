export interface AdminLot {
  id: string;
  name: string;
  fieldId: string;
  fieldName: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
  // Admin PR 5: contexto mínimo del campo — a propósito solo dos booleanos, no el
  // FieldAnalysisStatus completo de Campos (ver admin-lot.dto.ts en agro-score-api: "no convertir
  // Lotes en una copia de Campos"). Opcionales por compatibilidad con un backend más viejo.
  fieldHasAnalysis?: boolean;
  fieldHasActiveMonitoring?: boolean;
  createdAt: string;
  updatedAt: string;
}
