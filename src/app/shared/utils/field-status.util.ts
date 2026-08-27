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

// Admin PR 7: las 4 funciones de abajo solo leen analysisStatus/requiresAttention/weeklyMonitoring
// — angostado de `AdminField` completo (PR5) a este Pick puntual para que UserDetailField
// (user-detail.model.ts, sin ownerId/ownerEmail/ownerFullName: el detalle de usuario ya está
// scopeado a un solo dueño) también satisfaga el tipo sin necesitar un adaptador. AdminField sigue
// pasando tal cual — es un superset estructural del Pick, TypeScript lo acepta sin cambios en los
// callers existentes (fields.component.html, field-detail.component.ts).
type FieldAttentionSource = Pick<AdminField, 'analysisStatus' | 'requiresAttention'>;
type FieldMonitoringSource = Pick<AdminField, 'weeklyMonitoring'>;

/**
 * Admin PR 5: columna "Atención" — 3 estados visuales (no solo el booleano crudo de
 * requiresAttention): "Sin datos" cuando todavía no hay ningún análisis (no es honesto decir "OK"
 * sobre algo que nunca se evaluó), "Requiere atención"/"OK" en el resto de los casos.
 */
export function fieldAttentionLabel(field: FieldAttentionSource): string {
  if ((field.analysisStatus ?? 'without_analysis') === 'without_analysis') {
    return 'Sin datos';
  }
  return field.requiresAttention ? 'Requiere atención' : 'OK';
}

export function fieldAttentionTone(field: FieldAttentionSource): StatusTone {
  if ((field.analysisStatus ?? 'without_analysis') === 'without_analysis') {
    return 'neutral';
  }
  return field.requiresAttention ? 'error' : 'success';
}

export function fieldMonitoringLabel(field: FieldMonitoringSource): string {
  return field.weeklyMonitoring?.active ? 'Activo' : 'Inactivo';
}

export function fieldMonitoringTone(field: FieldMonitoringSource): StatusTone {
  return field.weeklyMonitoring?.active ? 'info' : 'neutral';
}
