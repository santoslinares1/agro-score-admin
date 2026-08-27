import { StatusTone } from '../components/status-badge/status-badge.component';
import {
  AnalysisTechnicalVerdictStatus,
  AnalysisVerdictConfidence,
  AnalysisVerdictLabel,
} from '../../core/models/analysis.model';
import { WeeklyVerdictTrend } from '../../core/models/scheduled-analysis.model';

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

// Fix (auditoría final pre-demo): antes devolvía el enum crudo en inglés tal cual ("generated"),
// documentado como "a propósito" en PR 13A — un badge en inglés sin traducir no es aceptable para
// una demo a socios. `pending` se traduce igual que "sin veredicto todavía" (mismo texto que se
// usa cuando `technicalVerdict` es null/undefined, ver analysis.component.html/
// scheduled-analysis.component.html) — el tono del badge (`info`, más abajo) sigue distinguiendo
// visualmente "en curso" de "nunca se intentó".
const GENERATION_STATUS_LABELS: Record<AnalysisTechnicalVerdictStatus, string> = {
  generated: 'Generado',
  failed: 'Falló',
  pending: 'Sin veredicto',
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

// PR 16D: trend no tiene equivalente en el veredicto individual (sin eje temporal) — mismo copy
// que agro-score-api/src/weekly-technical-verdict/weekly-technical-verdict-labels.ts y el mail
// semanal (PR 16C).
const TREND_LABELS: Record<WeeklyVerdictTrend, string> = {
  improving: 'En mejora',
  stable: 'Estable',
  worsening: 'En deterioro',
  mixed: 'Mixta',
  insufficient_data: 'Datos insuficientes',
};

const TREND_TONES: Record<WeeklyVerdictTrend, StatusTone> = {
  improving: 'success',
  stable: 'neutral',
  worsening: 'error',
  mixed: 'warning',
  insufficient_data: 'neutral',
};

export function trendLabel(trend: WeeklyVerdictTrend | null): string {
  return trend ? TREND_LABELS[trend] : 'No disponible';
}

export function trendTone(trend: WeeklyVerdictTrend | null): StatusTone {
  return trend ? TREND_TONES[trend] : 'neutral';
}
