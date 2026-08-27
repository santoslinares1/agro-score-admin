import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminFieldDetail, FieldDetailWeeklyMonitoring } from '../../../core/models/field-detail.model';
import { FieldDetailService } from '../../../core/services/field-detail.service';
import { CopyableIdComponent } from '../../../shared/components/copyable-id/copyable-id.component';
import { StatusBadgeComponent, StatusTone } from '../../../shared/components/status-badge/status-badge.component';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { analysisStatusTone } from '../../../shared/utils/analysis-status.util';
import {
  fieldAnalysisStatusLabel,
  fieldAnalysisStatusTone,
  fieldAttentionLabel,
  fieldAttentionTone,
} from '../../../shared/utils/field-status.util';
import { scoreBandLabel, scoreBandTone } from '../../../shared/utils/score-band.util';
import {
  runMailStatusLabel,
  runMailStatusTone,
  runStatusLabel,
  runStatusTone,
} from '../../../shared/utils/scheduled-analysis-status.util';
import {
  confidenceLabel,
  trendLabel,
  trendTone,
  verdictLabel,
  verdictTone,
} from '../../../shared/utils/technical-verdict-labels';

/**
 * Admin PR 6: vista de detalle de UN campo, solo lectura — consolida en una pantalla lo que hoy
 * exige saltar entre Campos/Lotes/Diagnósticos/Programados. Reusa (nunca duplica) las mismas
 * reglas de estado que ya usa la tabla de Campos (PR5): fieldAttentionLabel/Tone y
 * fieldAnalysisStatusLabel/Tone reciben `detail().field` directo — ese sub-objeto ya trae
 * analysisStatus/requiresAttention required (vs. opcionales en AdminField, PR5), así que satisface
 * el mismo shape sin necesitar un adaptador ni un cast.
 */
@Component({
  selector: 'app-field-detail',
  standalone: true,
  imports: [DatePipe, DurationPipe, RouterLink, StatusBadgeComponent, CopyableIdComponent],
  templateUrl: './field-detail.component.html',
  styleUrls: ['../../shared-list.component.css', './field-detail.component.css'],
})
export class FieldDetailComponent implements OnInit {
  private readonly fieldDetailService = inject(FieldDetailService);
  private readonly route = inject(ActivatedRoute);

  protected readonly fieldId = signal('');
  protected readonly detail = signal<AdminFieldDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly analysisStatusTone = analysisStatusTone;
  protected readonly fieldAnalysisStatusLabel = fieldAnalysisStatusLabel;
  protected readonly fieldAnalysisStatusTone = fieldAnalysisStatusTone;
  protected readonly fieldAttentionLabel = fieldAttentionLabel;
  protected readonly fieldAttentionTone = fieldAttentionTone;
  protected readonly scoreBandLabel = scoreBandLabel;
  protected readonly scoreBandTone = scoreBandTone;
  protected readonly verdictLabel = verdictLabel;
  protected readonly verdictTone = verdictTone;
  protected readonly confidenceLabel = confidenceLabel;
  protected readonly trendLabel = trendLabel;
  protected readonly trendTone = trendTone;
  protected readonly runStatusLabel = runStatusLabel;
  protected readonly runStatusTone = runStatusTone;
  protected readonly runMailStatusLabel = runMailStatusLabel;
  protected readonly runMailStatusTone = runMailStatusTone;

  ngOnInit(): void {
    this.fieldId.set(this.route.snapshot.paramMap.get('fieldId') ?? '');
    this.load();
  }

  // weeklyMonitoring vive en una posición distinta en AdminFieldDetail (top-level) que en
  // AdminField (anidado bajo field.weeklyMonitoring, PR5) — reimplementar acá 2 líneas es más
  // simple y honesto que forzar un objeto AdminField falso solo para reusar fieldMonitoringLabel.
  protected monitoringLabel(weeklyMonitoring: FieldDetailWeeklyMonitoring): string {
    return weeklyMonitoring.active ? 'Activo' : 'Inactivo';
  }

  protected monitoringTone(weeklyMonitoring: FieldDetailWeeklyMonitoring): StatusTone {
    return weeklyMonitoring.active ? 'info' : 'neutral';
  }

  private load(): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.fieldDetailService.get(this.fieldId()).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 404) {
          this.notFound.set(true);
        } else {
          this.errorMessage.set('No se pudo cargar el detalle del campo.');
        }
      },
    });
  }
}
