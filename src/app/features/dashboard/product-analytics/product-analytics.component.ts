import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AdminProductAnalytics,
  ProductAnalyticsFunnelStage,
  ProductAnalyticsInsightSeverity,
} from '../../../core/models/product-analytics.model';
import { ProductAnalyticsService } from '../../../core/services/product-analytics.service';
import { StatusBadgeComponent, StatusTone } from '../../../shared/components/status-badge/status-badge.component';

const SEVERITY_LABELS: Record<ProductAnalyticsInsightSeverity, string> = {
  critical: 'Crítico',
  warning: 'Atención',
  opportunity: 'Oportunidad',
  info: 'Info',
};

const SEVERITY_TONES: Record<ProductAnalyticsInsightSeverity, StatusTone> = {
  critical: 'error',
  warning: 'warning',
  opportunity: 'info',
  info: 'info',
};

/**
 * Admin PR 4: sección "Embudo de uso" del Dashboard — carga /admin/product-analytics por su
 * cuenta (no recibe datos por @Input de DashboardComponent) para que un error acá nunca tumbe el
 * resto del Dashboard, que ya terminó de cargar /admin/metrics de forma independiente.
 */
@Component({
  selector: 'app-product-analytics',
  standalone: true,
  imports: [DecimalPipe, RouterLink, StatusBadgeComponent],
  templateUrl: './product-analytics.component.html',
  styleUrl: './product-analytics.component.css',
})
export class ProductAnalyticsComponent implements OnInit {
  private readonly productAnalyticsService = inject(ProductAnalyticsService);

  protected readonly analytics = signal<AdminProductAnalytics | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected severityLabel(severity: ProductAnalyticsInsightSeverity): string {
    return SEVERITY_LABELS[severity];
  }

  protected severityTone(severity: ProductAnalyticsInsightSeverity): StatusTone {
    return SEVERITY_TONES[severity];
  }

  // Ancho de la barra de cada etapa relativo a la PRIMERA etapa del funnel (no a la etapa
  // anterior, que es lo que ya muestra conversionFromPrevious) — así la barra se lee de un
  // vistazo como "qué fracción del punto de partida llegó hasta acá".
  protected barWidthPercent(stage: ProductAnalyticsFunnelStage, funnel: ProductAnalyticsFunnelStage[]): number {
    const first = funnel[0]?.count ?? 0;
    if (first <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((stage.count / first) * 100));
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.productAnalyticsService.getProductAnalytics().subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las métricas de producto.');
        this.loading.set(false);
      },
    });
  }
}
