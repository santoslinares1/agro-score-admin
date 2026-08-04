import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { AdminAnalysis, AnalysisStatus } from '../../core/models/analysis.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [DatePipe, PaginationControlsComponent, StatusBadgeComponent, DurationPipe],
  templateUrl: './analysis.component.html',
  styleUrl: '../shared-list.component.css',
})
export class AnalysisComponent implements OnInit {
  private readonly analysisService = inject(AnalysisService);

  protected readonly statuses: AnalysisStatus[] = ['Procesando', 'Finalizado', 'Error'];
  protected readonly analysisStatusTone = analysisStatusTone;

  protected readonly items = signal<AdminAnalysis[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly status = signal<AnalysisStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.analysisService
      .list({
        page: this.page(),
        limit: this.limit,
        status: this.status() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de diagnósticos.');
          this.loading.set(false);
        },
      });
  }

  protected onStatusChange(value: string): void {
    this.status.set(value as AnalysisStatus | '');
    this.page.set(1);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }
}
