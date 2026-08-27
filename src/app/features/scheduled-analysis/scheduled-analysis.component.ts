import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  AdminScheduledAnalysisItem,
  AdminScheduledAnalysisSummary,
} from '../../core/models/scheduled-analysis.model';
import { ScheduledAnalysisService } from '../../core/services/scheduled-analysis.service';
import { CopyableIdComponent } from '../../shared/components/copyable-id/copyable-id.component';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';
import {
  flowStageTone,
  flowStateBadgeLabel,
  mailStatusLabel,
  mailStatusTone,
  resolveFlowState,
  runStatusLabel,
  runStatusTone,
  scheduleTone,
} from '../../shared/utils/scheduled-analysis-status.util';
import {
  confidenceLabel,
  generationStatusLabel,
  generationStatusTone,
  trendLabel,
  trendTone,
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
 * PR 16D suma el diagnóstico semanal comparativo (weeklyTechnicalVerdict) — mismo criterio de
 * solo lectura, nunca dispara ni regenera nada.
 */
@Component({
  selector: 'app-scheduled-analysis',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    PaginationControlsComponent,
    StatusBadgeComponent,
    CopyableIdComponent,
  ],
  templateUrl: './scheduled-analysis.component.html',
  styleUrl: '../shared-list.component.css',
})
export class ScheduledAnalysisComponent implements OnInit {
  private readonly scheduledAnalysisService = inject(ScheduledAnalysisService);
  private readonly route = inject(ActivatedRoute);

  protected readonly analysisStatusTone = analysisStatusTone;
  protected readonly scheduleTone = scheduleTone;
  protected readonly runStatusLabel = runStatusLabel;
  protected readonly runStatusTone = runStatusTone;
  protected readonly mailStatusLabel = mailStatusLabel;
  protected readonly mailStatusTone = mailStatusTone;
  protected readonly resolveFlowState = resolveFlowState;
  protected readonly flowStageTone = flowStageTone;
  protected readonly flowStateBadgeLabel = flowStateBadgeLabel;
  protected readonly verdictLabel = verdictLabel;
  protected readonly confidenceLabel = confidenceLabel;
  protected readonly generationStatusLabel = generationStatusLabel;
  protected readonly verdictTone = verdictTone;
  protected readonly generationStatusTone = generationStatusTone;
  protected readonly trendLabel = trendLabel;
  protected readonly trendTone = trendTone;

  protected readonly items = signal<AdminScheduledAnalysisItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // Admin PR 3: resumen global (todos los schedules, no acotado a filtros/página) — ver
  // AdminService.getScheduledAnalysisSummary en agro-score-api.
  protected readonly summary = signal<AdminScheduledAnalysisSummary | null>(null);

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  // Admin PR 2: trazabilidad — "ver programados de este campo/usuario" desde Campos/Usuarios
  // (/scheduled-analysis?fieldId=<uuid>, ?userId=<uuid>, ?enabled=true).
  // Admin PR 3: hasRuns=false es el link real detrás de la alerta "Schedules activos sin
  // corridas" del Dashboard (?enabled=true&hasRuns=false) — usa existencia real de corridas, no
  // lastRunAt.
  protected readonly fieldIdFilter = signal<string | undefined>(undefined);
  protected readonly userIdFilter = signal<string | undefined>(undefined);
  protected readonly enabledFilter = signal<boolean | undefined>(undefined);
  protected readonly hasRunsFilter = signal<boolean | undefined>(undefined);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.fieldIdFilter.set(params.get('fieldId') ?? undefined);
    this.userIdFilter.set(params.get('userId') ?? undefined);

    const enabled = params.get('enabled');
    if (enabled === 'true' || enabled === 'false') {
      this.enabledFilter.set(enabled === 'true');
    }

    const hasRuns = params.get('hasRuns');
    if (hasRuns === 'true' || hasRuns === 'false') {
      this.hasRunsFilter.set(hasRuns === 'true');
    }

    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.scheduledAnalysisService
      .list({
        page: this.page(),
        limit: this.limit,
        fieldId: this.fieldIdFilter(),
        userId: this.userIdFilter(),
        enabled: this.enabledFilter(),
        hasRuns: this.hasRunsFilter(),
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.summary.set(result.summary);
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

  protected clearFieldIdFilter(): void {
    this.fieldIdFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearUserIdFilter(): void {
    this.userIdFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearEnabledFilter(): void {
    this.enabledFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearHasRunsFilter(): void {
    this.hasRunsFilter.set(undefined);
    this.page.set(1);
    this.load();
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
