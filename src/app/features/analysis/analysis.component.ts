import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminAnalysis, AnalysisStatus } from '../../core/models/analysis.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { UsersService } from '../../core/services/users.service';
import { CopyableIdComponent } from '../../shared/components/copyable-id/copyable-id.component';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';
import {
  confidenceLabel,
  generationStatusLabel,
  generationStatusTone,
  verdictLabel,
  verdictTone,
} from '../../shared/utils/technical-verdict-labels';

const PAGE_LIMIT = 20;

// Copy obligatorio (contrato actual del backend: "retry requested", no
// re-ejecución real — ver docs/admin-backend.md en agro-score-api).
const RETRY_COPY =
  'El backend registra la solicitud de reintento. La re-ejecución automática del pipeline todavía no está habilitada.';

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    PaginationControlsComponent,
    StatusBadgeComponent,
    DurationPipe,
    CopyableIdComponent,
  ],
  templateUrl: './analysis.component.html',
  styleUrl: '../shared-list.component.css',
})
export class AnalysisComponent implements OnInit {
  private readonly analysisService = inject(AnalysisService);
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);

  protected readonly statuses: AnalysisStatus[] = ['Procesando', 'Finalizado', 'Error'];
  protected readonly analysisStatusTone = analysisStatusTone;
  protected readonly retryCopy = RETRY_COPY;

  // PR 13A: veredicto técnico — solo lectura, mismos labels que web/PDF (ver
  // technical-verdict-labels.ts), pero acá se permiten mostrar generator/promptVersion/
  // generatedAt/errorMessage (soporte/debugging), nunca en el frontend público.
  protected readonly verdictLabel = verdictLabel;
  protected readonly confidenceLabel = confidenceLabel;
  protected readonly generationStatusLabel = generationStatusLabel;
  protected readonly verdictTone = verdictTone;
  protected readonly generationStatusTone = generationStatusTone;

  protected readonly items = signal<AdminAnalysis[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // Filtros — se aplican con un botón explícito (son varios y algunos de
  // texto libre, no tiene sentido re-pedir en cada tecla como el buscador
  // de otras pantallas).
  protected status: AnalysisStatus | '' = '';
  protected onlyFailed = false;
  protected onlyUnreviewed = false;
  protected analysisId = '';
  protected fieldId = '';
  protected userId = '';
  protected from = '';
  protected to = '';

  private readonly userLabels = signal<Record<string, string>>({});

  // Ids con una acción en curso, para deshabilitar el botón puntual sin
  // bloquear el resto de la tabla.
  protected readonly actionPendingId = signal<string | null>(null);

  // Ids cuya celda de error está expandida (texto completo en vez de
  // truncado). Cada fila se expande/colapsa de forma independiente.
  private readonly expandedErrorIds = signal<ReadonlySet<string>>(new Set());

  // PR 13A: mismo patrón que expandedErrorIds — set independiente para no acoplar el toggle del
  // panel de veredicto técnico con el de error (una fila puede tener ambos, o solo uno).
  private readonly expandedVerdictIds = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.applyQueryParamFilters();
    this.load();
    this.usersService.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => {
        const labels: Record<string, string> = {};
        result.items.forEach((u) => {
          labels[u.id] = `${u.fullName} (${u.email})`;
        });
        this.userLabels.set(labels);
      },
      error: () => undefined,
    });
  }

  // Admin PR 1: soporte mínimo de deep links desde las alertas operativas del Dashboard
  // (/analysis?status=Error, /analysis?status=Error&onlyUnreviewed=true) — se lee una sola vez al
  // entrar a la pantalla, no se re-sincroniza con la URL mientras el usuario cambia filtros a mano
  // (mismo alcance que el resto de esta ficha: filtros que ya existían, no un router de estado).
  private applyQueryParamFilters(): void {
    const params = this.route.snapshot.queryParamMap;

    const status = params.get('status');
    if (status && (this.statuses as string[]).includes(status)) {
      this.status = status as AnalysisStatus;
    }

    this.onlyFailed = params.get('onlyFailed') === 'true';
    this.onlyUnreviewed = params.get('onlyUnreviewed') === 'true';
    this.analysisId = params.get('analysisId') ?? '';
    this.fieldId = params.get('fieldId') ?? '';
    this.userId = params.get('userId') ?? '';
    this.from = params.get('from') ?? '';
    this.to = params.get('to') ?? '';
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.analysisService
      .list({
        page: this.page(),
        limit: this.limit,
        status: this.status || undefined,
        onlyFailed: this.onlyFailed || undefined,
        onlyUnreviewed: this.onlyUnreviewed || undefined,
        analysisId: this.analysisId.trim() || undefined,
        fieldId: this.fieldId.trim() || undefined,
        userId: this.userId.trim() || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(apiErrorMessage(err, 'No se pudo cargar la lista de diagnósticos.'));
          this.loading.set(false);
        },
      });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  protected clearFilters(): void {
    this.status = '';
    this.onlyFailed = false;
    this.onlyUnreviewed = false;
    this.analysisId = '';
    this.fieldId = '';
    this.userId = '';
    this.from = '';
    this.to = '';
    this.applyFilters();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected reviewerLabel(userId: string | null): string {
    if (!userId) {
      return '';
    }

    return this.userLabels()[userId] ?? userId;
  }

  protected isErrorExpanded(id: string): boolean {
    return this.expandedErrorIds().has(id);
  }

  protected toggleErrorExpanded(id: string): void {
    const next = new Set(this.expandedErrorIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedErrorIds.set(next);
  }

  protected isVerdictExpanded(id: string): boolean {
    return this.expandedVerdictIds().has(id);
  }

  protected toggleVerdictExpanded(id: string): void {
    const next = new Set(this.expandedVerdictIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedVerdictIds.set(next);
  }

  protected markReviewed(item: AdminAnalysis): void {
    if (!confirm(`¿Marcar como revisado el diagnóstico de "${item.fieldName ?? item.id}"?`)) {
      return;
    }

    this.actionPendingId.set(item.id);
    this.analysisService.markReviewed(item.id).subscribe({
      next: () => {
        this.actionPendingId.set(null);
        this.load();
      },
      error: (err) => {
        this.actionPendingId.set(null);
        this.errorMessage.set(apiErrorMessage(err, 'No se pudo marcar el diagnóstico como revisado.'));
      },
    });
  }

  protected retry(item: AdminAnalysis): void {
    if (!confirm(`${this.retryCopy}\n\n¿Registrar un pedido de reintento para "${item.fieldName ?? item.id}"?`)) {
      return;
    }

    this.actionPendingId.set(item.id);
    this.analysisService.retry(item.id).subscribe({
      next: () => {
        this.actionPendingId.set(null);
        this.load();
      },
      error: (err) => {
        this.actionPendingId.set(null);
        this.errorMessage.set(apiErrorMessage(err, 'No se pudo registrar el pedido de reintento.'));
      },
    });
  }
}
