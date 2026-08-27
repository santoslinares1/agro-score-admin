// Admin PR 4: mismo shape que AdminProductAnalyticsDto en agro-score-api
// (src/admin/dto/admin-product-analytics.dto.ts) — el frontend solo pinta lo que recibe, el copy
// básico (label/description/title) ya viene armado desde la API para este PR puntual (a
// diferencia de operational-alerts.util.ts en PR1, donde el copy vive acá).

export type ProductAnalyticsFunnelStage = {
  id: string;
  label: string;
  count: number;
  previousCount?: number;
  /** Fracción 0–1, no porcentaje — se formatea en el template. `undefined` si no aplica. */
  conversionFromPrevious?: number;
  /** previousCount - count. Puede ser negativo (la etapa creció respecto de la anterior). */
  dropoffFromPrevious?: number;
  description?: string;
  route?: string;
  queryParams?: Record<string, string | number | boolean>;
};

export type ProductAnalyticsInsightSeverity = 'critical' | 'warning' | 'info' | 'opportunity';

export type ProductAnalyticsInsight = {
  id: string;
  severity: ProductAnalyticsInsightSeverity;
  title: string;
  description: string;
  route?: string;
  queryParams?: Record<string, string | number | boolean>;
};

export type ProductAnalyticsWeeklyMonitoring = {
  totalFields: number;
  activeSchedules: number;
  activeSchedulesWithoutRuns: number;
  schedulesWithRuns: number;
  sentEmails: number;
};

export type AnalysisErrorBucket = {
  message: string;
  count: number;
};

export interface AdminProductAnalytics {
  generatedAt: string;
  funnel: ProductAnalyticsFunnelStage[];
  insights: ProductAnalyticsInsight[];
  weeklyMonitoring: ProductAnalyticsWeeklyMonitoring;
  topAnalysisErrorsLast30Days: AnalysisErrorBucket[];
}
