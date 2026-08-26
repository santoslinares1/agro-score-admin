// Admin PR 1: shape que arma buildOperationalAlerts() (shared/utils/operational-alerts.util.ts)
// a partir de /admin/metrics — mismo criterio de shape sugerido por la auditoría UI/UX del admin.
export type OperationalAlertSeverity = 'critical' | 'warning' | 'opportunity' | 'info';

export interface OperationalAlert {
  id: string;
  severity: OperationalAlertSeverity;
  title: string;
  description: string;
  count: number;
  actionLabel: string;
  route: string;
  queryParams?: Record<string, string | number | boolean>;
}
