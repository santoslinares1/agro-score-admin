import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import {
  AdminProductAnalytics,
  WeeklySnapshotDataQuality,
} from '../../../core/models/product-analytics.model';
import { ProductAnalyticsService } from '../../../core/services/product-analytics.service';
import { StatusBadgeComponent, StatusTone } from '../../../shared/components/status-badge/status-badge.component';

const QUALITY_LABELS: Record<WeeklySnapshotDataQuality, string> = {
  sufficient: 'Sufficient',
  partial: 'Partial',
  insufficient: 'Insufficient',
};

// 'partial'/'insufficient' NUNCA se pintan como "error" (ver el ticket) — 'warning'/'neutral' son
// los tonos más cercanos a "calidad reducida", no "algo salió mal".
const QUALITY_TONES: Record<WeeklySnapshotDataQuality, StatusTone> = {
  sufficient: 'success',
  partial: 'warning',
  insufficient: 'neutral',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function shiftDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

/**
 * KPIs P0 (auditoría de KPIs + Decision 1/2) — sección "Entrega técnica" del Dashboard. Reemplaza
 * el "Embudo de uso" (Admin PR 4), que mezclaba users/fields/schedules/runs/emails en una sola
 * secuencia de "conversión" que nunca fue un funnel de cohorte real. Carga /admin/product-analytics
 * por su cuenta (no recibe datos por @Input de DashboardComponent) — mismo criterio que antes: un
 * error acá nunca tumba el resto del Dashboard.
 *
 * Todo el copy usa deliberadamente "entrega técnica" / "resultado técnicamente utilizable", nunca
 * "valor real" — estas métricas miden si el pipeline entregó un resultado sufficient, no si un
 * humano lo abrió, lo leyó o lo encontró útil (eso no se mide en este ticket).
 */
@Component({
  selector: 'app-product-analytics',
  standalone: true,
  imports: [DatePipe, StatusBadgeComponent],
  templateUrl: './product-analytics.component.html',
  styleUrl: './product-analytics.component.css',
})
export class ProductAnalyticsComponent implements OnInit {
  private readonly productAnalyticsService = inject(ProductAnalyticsService);

  protected readonly analytics = signal<AdminProductAnalytics | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  // Fecha (YYYY-MM-DD) dentro de la semana pedida — undefined = "última semana completa" (default
  // del backend). Nunca se calcula la semana en el frontend: siempre se refleja period.week que
  // devuelve la respuesta.
  private readonly requestedWeek = signal<string | undefined>(undefined);

  protected readonly qualityLabels = QUALITY_LABELS;
  protected readonly qualityTones = QUALITY_TONES;

  protected readonly isCurrentWeekView = computed(() => this.requestedWeek() === undefined);

  ngOnInit(): void {
    this.load();
  }

  protected previousWeek(): void {
    const week = this.analytics()?.period.week;
    if (!week) {
      return;
    }
    this.requestedWeek.set(shiftDateOnly(week.weekStart, -7));
    this.load();
  }

  protected nextWeek(): void {
    const week = this.analytics()?.period.week;
    if (!week) {
      return;
    }
    this.requestedWeek.set(shiftDateOnly(week.weekStart, 7));
    this.load();
  }

  protected backToLatestWeek(): void {
    this.requestedWeek.set(undefined);
    this.load();
  }

  protected formatPercent(rate: number | null): string | null {
    return rate === null ? null : `${(rate * 100).toFixed(1)}%`;
  }

  protected formatHours(hours: number | null): string | null {
    if (hours === null) {
      return null;
    }
    if (hours < 48) {
      return `${hours.toFixed(1)} h`;
    }
    return `${(hours / 24).toFixed(1)} días`;
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.productAnalyticsService.getProductAnalytics(this.requestedWeek()).subscribe({
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
