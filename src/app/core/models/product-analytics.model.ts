// KPIs P0 (auditoría de KPIs + Decision 1/2): mismo shape que AdminProductAnalyticsDto en
// agro-score-api (src/admin/dto/admin-product-analytics.dto.ts) — el frontend solo pinta lo que
// recibe. Reemplaza el funnel de 9 etapas (Admin PR 4) que mezclaba users/fields/schedules/runs/
// emails en una sola "conversión" que nunca fue un funnel de cohorte real.
//
// Invariantes de shape que el template respeta:
// - Solo dataQualityStatus='sufficient' entra en un numerador de valor — 'partial' nunca se pinta
//   como si fuera utilizable, solo aparece en qualityBreakdown.
// - Cada rate viaja siempre junto a su numerador y denominador — nunca se muestra un % solo.
// - Ninguna sección mezcla unidades (users vs. fields) en una misma conversión.
// - `coverage` se muestra como nota honesta cuando un denominador es históricamente incompleto —
//   nunca se oculta ni se infiere silenciosamente.

export type WeeklySnapshotDataQuality = 'sufficient' | 'partial' | 'insufficient';

export type ProductAnalyticsWeek = {
  /** YYYY-MM-DD, lunes de la semana calendario. */
  weekStart: string;
  /** YYYY-MM-DD, domingo de la semana calendario. */
  weekEnd: string;
};

export type ProductAnalyticsCoverage = {
  scheduleHistory: {
    availableFrom: string | null;
    complete: boolean;
  };
  analysisClassificationScan: {
    scanned: number;
    limit: number;
    truncated: boolean;
  };
  /** Decisión de producto (North Star eligibility): la población de North Star se restringe a
   * schedules con configuración canónica (lunes 09:00 America/Argentina/Cordoba). `count` es
   * cuántos schedules HOY tienen otra configuración — quedan fuera de North Star por completo
   * (ni numerador ni denominador), nunca como "error", solo como señal de calidad de datos. */
  nonCanonicalSchedules: {
    count: number;
  };
};

export type NorthStarMetric = {
  week: ProductAnalyticsWeek;
  /** Fields con snapshot sufficient, RESTRINGIDO a la misma población elegible del denominador —
   * usableFieldsCount siempre <= eligibleFieldsCount. */
  usableFieldsCount: number;
  /** Fields con schedule canónico cuyo estado reconstruido al cutoff (lunes 09:00
   * America/Argentina/Cordoba de la semana) es enabled=true. */
  eligibleFieldsCount: number;
  rate: number | null;
};

export type ActivationMetric = {
  eligibleUsersCount: number;
  activatedUsersCount: number;
  rate: number | null;
};

export type TimeToFirstTechnicalValueMetric = {
  cohortUsersCount: number;
  activatedUsersCount: number;
  notActivatedUsersCount: number;
  p50Hours: number | null;
  p75Hours: number | null;
  p95Hours: number | null;
};

export type RetentionMetric = {
  /** N — siempre `period.week - 1`, nunca `period.week` (ver AdminService.getProductAnalytics en
   * la API): así `nextWeek` queda anclada a `period.week`, que en la carga por defecto ya es una
   * semana completa. */
  week: ProductAnalyticsWeek;
  /** N+1 — siempre `period.week`. */
  nextWeek: ProductAnalyticsWeek;
  /** true solo cuando N y N+1 terminaron completamente en America/Argentina/Cordoba. Si es false,
   * `rate` es null aunque haya snapshots parciales reales — nunca se infiere completitud desde la
   * existencia de datos. */
  periodComplete: boolean;
  sufficientInWeekCount: number;
  retainedInNextWeekCount: number;
  rate: number | null;
};

export type QualityBreakdownEntry = {
  status: WeeklySnapshotDataQuality;
  count: number;
  proportion: number | null;
};

export type QualityBreakdownMetric = {
  week: ProductAnalyticsWeek;
  totalSnapshots: number;
  breakdown: QualityBreakdownEntry[];
};

export interface AdminProductAnalytics {
  generatedAt: string;
  period: {
    week: ProductAnalyticsWeek;
    timezone: string;
  };
  coverage: ProductAnalyticsCoverage;
  northStar: NorthStarMetric;
  activation: ActivationMetric;
  timeToFirstTechnicalValue: TimeToFirstTechnicalValueMetric;
  retention: RetentionMetric;
  qualityBreakdown: QualityBreakdownMetric;
}
