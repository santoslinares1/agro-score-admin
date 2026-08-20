import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminAnalysis, AnalysisStatus } from '../../core/models/analysis.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { UsersService } from '../../core/services/users.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { analysisStatusTone } from '../../shared/utils/analysis-status.util';

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
  imports: [DatePipe, FormsModule, PaginationControlsComponent, StatusBadgeComponent, DurationPipe],
  templateUrl: './analysis.component.html',
  styleUrl: '../shared-list.component.css',
})
export class AnalysisComponent implements OnInit {
  private readonly analysisService = inject(AnalysisService);
  private readonly usersService = inject(UsersService);

  protected readonly statuses: AnalysisStatus[] = ['Procesando', 'Finalizado', 'Error'];
  protected readonly analysisStatusTone = analysisStatusTone;
  protected readonly retryCopy = RETRY_COPY;

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

  ngOnInit(): void {
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

  protected shortId(id: string): string {
    return id.slice(0, 8);
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
