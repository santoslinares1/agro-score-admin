import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminMetrics } from '../../core/models/metrics.model';
import { MetricsService } from '../../core/services/metrics.service';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, DurationPipe, StatusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly metricsService = inject(MetricsService);

  protected readonly metrics = signal<AdminMetrics | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly analysisStatusTone = analysisStatusTone;

  ngOnInit(): void {
    this.load();
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
