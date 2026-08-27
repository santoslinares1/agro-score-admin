import { AdminField, FieldAnalysisStatus } from '../../core/models/field.model';
import { StatusTone } from '../components/status-badge/status-badge.component';

// Admin PR 5: mismos 5 estados que AdminFieldAnalysisStatus (agro-score-api/src/admin/dto/
// admin-field.dto.ts) — estado administrativo/producto, nunca un diagnóstico agronómico.
const ANALYSIS_STATUS_LABELS: Record<FieldAnalysisStatus, string> = {
  without_analysis: 'Sin diagnóstico',
  processing: 'Procesando',
  completed: 'Finalizado',
  error: 'Error',
  attention: 'Requiere atención',
};

const ANALYSIS_STATUS_TONES: Record<FieldAnalysisStatus, StatusTone> = {
  without_analysis: 'neutral',
  processing: 'info',
  completed: 'success',
  error: 'error',
  attention: 'warning',
};

// `analysisStatus` es opcional en AdminField por compatibilidad con un backend más viejo (ver
// comentario en field.model.ts) — sin dato, se trata como "sin diagnóstico" en vez de romper.
export function fieldAnalysisStatusLabel(status: FieldAnalysisStatus | undefined): string {
  return ANALYSIS_STATUS_LABELS[status ?? 'without_analysis'];
}

export function fieldAnalysisStatusTone(status: FieldAnalysisStatus | undefined): StatusTone {
  return ANALYSIS_STATUS_TONES[status ?? 'without_analysis'];
}

/**
 * Admin PR 5: columna "Atención" — 3 estados visuales (no solo el booleano crudo de
 * requiresAttention): "Sin datos" cuando todavía no hay ningún análisis (no es honesto decir "OK"
 * sobre algo que nunca se evaluó), "Requiere atención"/"OK" en el resto de los casos.
 */
export function fieldAttentionLabel(field: AdminField): string {
  if ((field.analysisStatus ?? 'without_analysis') === 'without_analysis') {
    return 'Sin datos';
  }
  return field.requiresAttention ? 'Requiere atención' : 'OK';
}

export function fieldAttentionTone(field: AdminField): StatusTone {
  if ((field.analysisStatus ?? 'without_analysis') === 'without_analysis') {
    return 'neutral';
  }
  return field.requiresAttention ? 'error' : 'success';
}

export function fieldMonitoringLabel(field: AdminField): string {
  return field.weeklyMonitoring?.active ? 'Activo' : 'Inactivo';
}

export function fieldMonitoringTone(field: AdminField): StatusTone {
  return field.weeklyMonitoring?.active ? 'info' : 'neutral';
}
