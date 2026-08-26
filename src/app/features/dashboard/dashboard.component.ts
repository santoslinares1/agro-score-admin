import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AccessRequestStatus } from '../../core/models/access-request.model';
import { AdminMetrics } from '../../core/models/metrics.model';
import { OperationalAlert } from '../../core/models/operational-alert.model';
import { MetricsService } from '../../core/services/metrics.service';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { OperationalAlertsComponent } from '../../shared/components/operational-alerts/operational-alerts.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';
import {
  ACCESS_REQUEST_STATUS_LABELS,
  accessRequestStatusTone,
} from '../../shared/utils/access-request-status.util';
import { buildOperationalAlerts } from '../../shared/utils/operational-alerts.util';

const ACCESS_REQUEST_STATUS_ORDER: AccessRequestStatus[] = [
  'new',
  'contacted',
  'interested',
  'converted',
  'discarded',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    DurationPipe,
    StatusBadgeComponent,
    OperationalAlertsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly metricsService = inject(MetricsService);

  protected readonly metrics = signal<AdminMetrics | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly analysisStatusTone = analysisStatusTone;
  protected readonly accessRequestStatusTone = accessRequestStatusTone;
  protected readonly accessRequestStatusLabels = ACCESS_REQUEST_STATUS_LABELS;
  protected readonly accessRequestStatusOrder = ACCESS_REQUEST_STATUS_ORDER;

  ngOnInit(): void {
    this.load();
  }

  // `/admin/metrics` no expone un contador de análisis "en proceso" (ver
  // docs/admin-audit.md §9). Los únicos tres estados posibles de un análisis
  // son Procesando/Finalizado/Error (ver AnalysisStatus), así que se deriva
  // de forma exacta a partir de los totales que el backend sí devuelve.
  // Se acota a 0 como defensa ante una lectura inconsistente entre contadores
  // (p. ej. un análisis creado entre los distintos COUNT del backend).
  protected processingAnalysis(m: AdminMetrics): number {
    return Math.max(0, m.totalAnalysis - m.completedAnalysis - m.failedAnalysis);
  }

  // Admin PR 1: alertas operativas — mismo patrón que processingAnalysis(m) de acá arriba (valor
  // derivado calculado desde el template, sin un signal aparte).
  protected operationalAlerts(m: AdminMetrics): OperationalAlert[] {
    return buildOperationalAlerts(m);
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.metricsService.getMetrics().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las métricas.');
        this.loading.set(false);
      },
    });
  }
}
