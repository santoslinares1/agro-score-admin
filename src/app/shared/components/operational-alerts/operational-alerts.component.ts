import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OperationalAlert, OperationalAlertSeverity } from '../../../core/models/operational-alert.model';
import { StatusBadgeComponent, StatusTone } from '../status-badge/status-badge.component';

const SEVERITY_LABELS: Record<OperationalAlertSeverity, string> = {
  critical: 'Crítico',
  warning: 'Atención',
  opportunity: 'Oportunidad',
  info: 'Info',
};

const SEVERITY_TONES: Record<OperationalAlertSeverity, StatusTone> = {
  critical: 'error',
  warning: 'warning',
  opportunity: 'info',
  info: 'info',
};

/**
 * Admin PR 1: franja "Alertas operativas" arriba del Dashboard — recibe la lista ya armada por
 * buildOperationalAlerts() (shared/utils/operational-alerts.util.ts) y solo se ocupa de pintarla.
 * No decide condiciones ni severidad, no llama a ningún servicio.
 */
@Component({
  selector: 'app-operational-alerts',
  standalone: true,
  imports: [RouterLink, StatusBadgeComponent],
  templateUrl: './operational-alerts.component.html',
  styleUrl: './operational-alerts.component.css',
})
export class OperationalAlertsComponent {
  readonly alerts = input.required<OperationalAlert[]>();

  protected severityLabel(severity: OperationalAlertSeverity): string {
    return SEVERITY_LABELS[severity];
  }

  protected severityTone(severity: OperationalAlertSeverity): StatusTone {
    return SEVERITY_TONES[severity];
  }
}
