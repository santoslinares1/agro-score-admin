import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminField, FieldAnalysisStatus } from '../../core/models/field.model';
import { FieldsService } from '../../core/services/fields.service';
import { CopyableIdComponent } from '../../shared/components/copyable-id/copyable-id.component';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import {
  confidenceLabel,
  verdictLabel,
  verdictTone,
} from '../../shared/utils/technical-verdict-labels';
import {
  fieldAnalysisStatusLabel,
  fieldAnalysisStatusTone,
  fieldAttentionLabel,
  fieldAttentionTone,
  fieldMonitoringLabel,
  fieldMonitoringTone,
} from '../../shared/utils/field-status.util';
import { scoreBandLabel, scoreBandTone } from '../../shared/utils/score-band.util';

const PAGE_LIMIT = 20;
const VALID_STATUS_FILTERS: FieldAnalysisStatus[] = [
  'without_analysis',
  'processing',
  'completed',
  'error',
  'attention',
];

@Component({
  selector: 'app-fields',
  standalone: true,
  imports: [
    DatePipe,
    DurationPipe,
    RouterLink,
    PaginationControlsComponent,
    CopyableIdComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './fields.component.html',
  styleUrl: '../shared-list.component.css',
})
export class FieldsComponent implements OnInit {
  private readonly fieldsService = inject(FieldsService);
  private readonly route = inject(ActivatedRoute);

  protected readonly items = signal<AdminField[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly search = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // Admin PR 1: filtro real detrás de la alerta "Campos sin diagnóstico" del Dashboard
  // (/fields?hasAnalysis=false) — se lee una sola vez de la URL al entrar a la pantalla, después
  // vive en este signal (igual que search/page) hasta que el usuario lo quita a mano.
  protected readonly hasAnalysisFilter = signal<boolean | undefined>(undefined);

  // Admin PR 2: trazabilidad — "ver campos de este usuario" (/fields?userId=<uuid>, desde
  // Usuarios/Diagnósticos/Programados) y "saltar a este campo puntual" (/fields?fieldId=<uuid>,
  // desde Diagnósticos/Programados, sin vista de detalle dedicada).
  protected readonly userIdFilter = signal<string | undefined>(undefined);
  protected readonly fieldIdFilter = signal<string | undefined>(undefined);

  // Admin PR 5: estado real de uso/producto (/fields?status=attention, etc.) y monitoreo semanal
  // (/fields?monitoring=active|inactive).
  protected readonly statusFilter = signal<FieldAnalysisStatus | undefined>(undefined);
  protected readonly monitoringFilter = signal<'active' | 'inactive' | undefined>(undefined);

  protected readonly fieldAnalysisStatusLabel = fieldAnalysisStatusLabel;
  protected readonly fieldAnalysisStatusTone = fieldAnalysisStatusTone;
  protected readonly fieldAttentionLabel = fieldAttentionLabel;
  protected readonly fieldAttentionTone = fieldAttentionTone;
  protected readonly fieldMonitoringLabel = fieldMonitoringLabel;
  protected readonly fieldMonitoringTone = fieldMonitoringTone;
  protected readonly scoreBandLabel = scoreBandLabel;
  protected readonly scoreBandTone = scoreBandTone;
  protected readonly verdictLabel = verdictLabel;
  protected readonly verdictTone = verdictTone;
  protected readonly confidenceLabel = confidenceLabel;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;

    const hasAnalysis = params.get('hasAnalysis');
    if (hasAnalysis === 'true' || hasAnalysis === 'false') {
      this.hasAnalysisFilter.set(hasAnalysis === 'true');
    }

    this.userIdFilter.set(params.get('userId') ?? undefined);
    this.fieldIdFilter.set(params.get('fieldId') ?? undefined);

    const status = params.get('status');
    if (status && (VALID_STATUS_FILTERS as string[]).includes(status)) {
      this.statusFilter.set(status as FieldAnalysisStatus);
    }

    const monitoring = params.get('monitoring');
    if (monitoring === 'active' || monitoring === 'inactive') {
      this.monitoringFilter.set(monitoring);
    }

    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.fieldsService
      .list({
        page: this.page(),
        limit: this.limit,
        search: this.search() || undefined,
        hasAnalysis: this.hasAnalysisFilter(),
        userId: this.userIdFilter(),
        fieldId: this.fieldIdFilter(),
        status: this.statusFilter(),
        monitoring: this.monitoringFilter(),
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de campos.');
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected clearHasAnalysisFilter(): void {
    this.hasAnalysisFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearUserIdFilter(): void {
    this.userIdFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearFieldIdFilter(): void {
    this.fieldIdFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearStatusFilter(): void {
    this.statusFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  protected clearMonitoringFilter(): void {
    this.monitoringFilter.set(undefined);
    this.page.set(1);
    this.load();
  }
}
