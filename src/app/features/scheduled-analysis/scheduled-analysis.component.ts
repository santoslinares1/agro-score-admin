import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { AdminScheduledAnalysisItem } from '../../core/models/scheduled-analysis.model';
import { ScheduledAnalysisService } from '../../core/services/scheduled-analysis.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';
import {
  mailStatusLabel,
  mailStatusTone,
  runStatusLabel,
  runStatusTone,
  scheduleTone,
} from '../../shared/utils/scheduled-analysis-status.util';
import {
  confidenceLabel,
  generationStatusLabel,
  generationStatusTone,
  verdictLabel,
  verdictTone,
} from '../../shared/utils/technical-verdict-labels';

const PAGE_LIMIT = 20;

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}

/**
 * PR 13B: visibilidad de solo lectura sobre el pipeline semanal (Fase 4A/5/12A) — schedule, la
 * corrida más reciente, el análisis que generó, su veredicto técnico y el estado del mail. Sin
 * acciones mutantes: no crea/activa/desactiva schedules, no reintenta el mail, no regenera nada.
 */
@Component({
  selector: 'app-scheduled-analysis',
  standalone: true,
  imports: [DatePipe, PaginationControlsComponent, StatusBadgeComponent],
  templateUrl: './scheduled-analysis.component.html',
  styleUrl: '../shared-list.component.css',
})
export class ScheduledAnalysisComponent implements OnInit {
  private readonly scheduledAnalysisService = inject(ScheduledAnalysisService);

  protected readonly analysisStatusTone = analysisStatusTone;
  protected readonly scheduleTone = scheduleTone;
  protected readonly runStatusLabel = runStatusLabel;
  protected readonly runStatusTone = runStatusTone;
  protected readonly mailStatusLabel = mailStatusLabel;
  protected readonly mailStatusTone = mailStatusTone;
  protected readonly verdictLabel = verdictLabel;
  protected readonly confidenceLabel = confidenceLabel;
  protected readonly generationStatusLabel = generationStatusLabel;
  protected readonly verdictTone = verdictTone;
  protected readonly generationStatusTone = generationStatusTone;

  protected readonly items = signal<AdminScheduledAnalysisItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.scheduledAnalysisService.list({ page: this.page(), limit: this.limit }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          apiErrorMessage(err, 'No se pudo cargar la lista de análisis programados.'),
        );
        this.loading.set(false);
      },
    });
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected shortId(id: string): string {
    return id.slice(0, 8);
  }

  protected frequencyLabel(frequency: string): string {
    return frequency === 'weekly' ? 'Semanal' : frequency;
  }

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleExpanded(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }
}
