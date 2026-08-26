import { StatusTone } from '../components/status-badge/status-badge.component';
import {
  AnalysisTechnicalVerdictStatus,
  AnalysisVerdictConfidence,
  AnalysisVerdictLabel,
} from '../../core/models/analysis.model';

// PR 13A: mismos labels que analysis-result.component.ts (agro-score-web, PR 11C) y
// report-pdf.helpers.ts (agro-score-api, PR 11D) — el veredicto usa el mismo copy en todos los
// canales, solo cambia qué campos internos se muestran (acá sí generator/promptVersion/errorMessage).
const VERDICT_LABELS: Record<AnalysisVerdictLabel, string> = {
  favorable: 'Favorable',
  attention: 'Requiere atención',
  critical: 'Crítico',
  insufficient_data: 'Datos insuficientes',
};

const CONFIDENCE_LABELS: Record<AnalysisVerdictConfidence, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

const GENERATION_STATUS_LABELS: Record<AnalysisTechnicalVerdictStatus, string> = {
  generated: 'generated',
  failed: 'failed',
  pending: 'pending',
};

const VERDICT_TONES: Record<AnalysisVerdictLabel, StatusTone> = {
  favorable: 'success',
  attention: 'warning',
  critical: 'error',
  insufficient_data: 'neutral',
};

const GENERATION_STATUS_TONES: Record<AnalysisTechnicalVerdictStatus, StatusTone> = {
  generated: 'success',
  failed: 'error',
  pending: 'info',
};

export function verdictLabel(verdict: AnalysisVerdictLabel | null): string {
  return verdict ? VERDICT_LABELS[verdict] : 'No disponible';
}

export function confidenceLabel(confidence: AnalysisVerdictConfidence | null): string {
  return confidence ? CONFIDENCE_LABELS[confidence] : 'No disponible';
}

/** Copy técnico crudo a propósito (ver ficha PR 13A: "conservar valores crudos" en admin). */
export function generationStatusLabel(status: AnalysisTechnicalVerdictStatus): string {
  return GENERATION_STATUS_LABELS[status] ?? status;
}

export function verdictTone(verdict: AnalysisVerdictLabel | null): StatusTone {
  return verdict ? VERDICT_TONES[verdict] : 'neutral';
}

export function generationStatusTone(status: AnalysisTechnicalVerdictStatus): StatusTone {
  return GENERATION_STATUS_TONES[status] ?? 'neutral';
}
