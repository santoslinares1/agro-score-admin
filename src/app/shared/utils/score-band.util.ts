import { StatusTone } from '../components/status-badge/status-badge.component';

/**
 * Admin PR 5: mismos umbrales que ya usa `scoreInterpretation` en
 * agro-score-web/src/app/features/app/analysis-result/analysis-result.component.ts (score >= 70
 * → favorable, score >= 40 → variabilidad interna, debajo → menor desempeño) — el admin no tenía
 * ninguna banda de score propia (se confirmó antes de escribir esto), así que este PR reusa la
 * que ya existe en el producto en vez de inventar una escala nueva. Etiquetas condensadas para una
 * celda de tabla, mismo significado. Solo lectura del score que ya trae el backend
 * (Analysis.globalScore vía FieldLatestAnalysis.score) — nunca se recalcula acá.
 */
export function scoreBandLabel(score: number): string {
  if (score >= 70) {
    return 'Favorable';
  }
  if (score >= 40) {
    return 'Variable';
  }
  return 'Bajo desempeño';
}

export function scoreBandTone(score: number): StatusTone {
  if (score >= 70) {
    return 'success';
  }
  if (score >= 40) {
    return 'warning';
  }
  return 'error';
}
