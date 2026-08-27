import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminUserDetail } from '../../../core/models/user-detail.model';
import { UserDetailService } from '../../../core/services/user-detail.service';
import { CopyableIdComponent } from '../../../shared/components/copyable-id/copyable-id.component';
import { StatusBadgeComponent, StatusTone } from '../../../shared/components/status-badge/status-badge.component';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { analysisStatusTone } from '../../../shared/utils/analysis-status.util';
import { getAuditActionLabel } from '../../../shared/utils/audit-action.util';
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

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  user: 'Usuario',
};

/**
 * Admin PR 7: vista de detalle de UN usuario, solo lectura — consolida en una pantalla lo que hoy
 * exige saltar entre Usuarios/Campos/Lotes/Diagnósticos/Programados/Auditoría. Reusa (nunca
 * duplica) las mismas reglas de estado que ya usan Campos (PR5) y Field Detail (PR6):
 * fieldAttentionLabel/Tone y fieldAnalysisStatusLabel/Tone reciben cada `field` de
 * `detail().fields` directo — ver el angostado a Pick<AdminField, ...> en field-status.util.ts
 * (PR7) que permite esto sin un adaptador ni un cast.
 */
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [DatePipe, DurationPipe, RouterLink, StatusBadgeComponent, CopyableIdComponent],
  templateUrl: './user-detail.component.html',
  // Reusa tal cual las clases .fd-* de Field Detail (PR6: header/summary-grid/summary-card) en vez
  // de redefinirlas — Angular escapa styleUrls al propio componente (mismo mecanismo que ya usa
  // field-detail.component.ts con shared-list.component.css), así que importar ese archivo acá es
  // seguro y no filtra estilos hacia FieldDetailComponent ni viceversa.
  styleUrls: [
    '../../shared-list.component.css',
    '../../fields/field-detail/field-detail.component.css',
    './user-detail.component.css',
  ],
})
export class UserDetailComponent implements OnInit {
  private readonly userDetailService = inject(UserDetailService);
  private readonly route = inject(ActivatedRoute);

  protected readonly userId = signal('');
  protected readonly detail = signal<AdminUserDetail | null>(null);
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
  protected readonly auditActionLabel = getAuditActionLabel;

  ngOnInit(): void {
    this.userId.set(this.route.snapshot.paramMap.get('userId') ?? '');
    this.load();
  }

  protected roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected roleTone(role: string): StatusTone {
    return role === 'owner' ? 'success' : role === 'admin' ? 'info' : 'neutral';
  }

  protected activeTone(isActive: boolean): StatusTone {
    return isActive ? 'success' : 'neutral';
  }

  private load(): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.userDetailService.get(this.userId()).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 404) {
          this.notFound.set(true);
        } else {
          this.errorMessage.set('No se pudo cargar el detalle del usuario.');
        }
      },
    });
  }
}
