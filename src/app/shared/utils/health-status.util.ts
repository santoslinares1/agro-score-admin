import { HealthStatus } from '../../core/models/system-health.model';
import { StatusTone } from '../components/status-badge/status-badge.component';

const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  ok: 'OK',
  error: 'Error',
  unreachable: 'Inalcanzable',
  not_checked: 'No verificado',
};

export function healthStatusLabel(status: HealthStatus): string {
  return HEALTH_STATUS_LABELS[status] ?? status;
}

// ADMIN-2: 'not_checked' NO es un error (ver earthEngine en
// GET /admin/system/health) — se pinta neutral, no rojo, para no alarmar
// por algo que es una decisión de diseño (evitar costo/latencia de EE), no
// una falla real.
export function healthStatusTone(status: HealthStatus): StatusTone {
  switch (status) {
    case 'ok':
      return 'success';
    case 'error':
    case 'unreachable':
      return 'error';
    case 'not_checked':
      return 'neutral';
    default:
      return 'neutral';
  }
}
