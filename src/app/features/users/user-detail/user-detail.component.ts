import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AdminUserDetail } from '../../../core/models/user-detail.model';
import { UserDetailService } from '../../../core/services/user-detail.service';
import { UsersService } from '../../../core/services/users.service';
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

// Mismo criterio que users.component.ts — cada componente que llama a UsersService define su
// propia copia local en vez de un util compartido (no hay uno hoy en este repo).
function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}

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
})
export class UserDetailComponent implements OnInit {
  private readonly userDetailService = inject(UserDetailService);
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);

  protected readonly userId = signal('');
  protected readonly detail = signal<AdminUserDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // MEASUREMENT GAP P1-06 ("Self-service frente a asistencia"): único estado mutante de esta
  // pantalla (ver el test "no muestra botones mutantes" — Editar/Generar reset/Desactivar siguen
  // ausentes acá a propósito; esta es la única excepción, explícitamente pedida por el ticket).
  protected readonly assistanceSubmitting = signal(false);
  protected readonly assistanceError = signal<string | null>(null);

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

  /**
   * MEASUREMENT GAP P1-06 ("Self-service frente a asistencia"): un owner/admin confirma
   * explícitamente que el equipo empezó a asistir MATERIALMENTE a este usuario — nunca se dispara
   * solo, nunca desde crear la cuenta/invitación, nunca desde ningún otro flujo de esta pantalla.
   *
   * Set-once real en el backend (ver UsersService.markActivationAssistanceStarted en la API): acá
   * solo se pide confirmación explícita y se refleja el resultado — nunca se permite reintentar
   * desde la UI una vez que `detail().user.activationAssistanceStartedAt` quedó poblado (el botón
   * deja de renderizarse, ver template), y nunca se acepta editar/backdatear la fecha (no hay
   * ningún input de fecha en este flujo).
   */
  protected markAssistanceStarted(): void {
    const current = this.detail();
    if (!current || current.user.activationAssistanceStartedAt) {
      return;
    }

    if (
      !confirm(
        `¿Marcar el inicio de asistencia de activación para ${current.user.fullName} (${current.user.email})?\n\n` +
          'Esta acción es permanente: no se puede editar ni deshacer, y afecta la interpretación de KPIs de ' +
          'self-service vs. asistido para este usuario a partir de este momento.',
      )
    ) {
      return;
    }

    this.assistanceSubmitting.set(true);
    this.assistanceError.set(null);

    this.usersService.markActivationAssistanceStarted(current.user.id).subscribe({
      next: (updatedUser) => {
        this.assistanceSubmitting.set(false);
        // Solo actualiza el usuario dentro del detalle ya cargado — nunca vuelve a pedir/recalcular
        // fields/analyses/scheduledAnalysis/auditLogs, que no cambiaron como efecto de esta acción.
        this.detail.update((d) => (d ? { ...d, user: updatedUser } : d));
      },
      error: (error: unknown) => {
        this.assistanceSubmitting.set(false);
        // Nunca toca `detail()` ante un error — el usuario sigue viendo el estado previo intacto.
        this.assistanceError.set(
          apiErrorMessage(error, 'No se pudo marcar el inicio de asistencia.'),
        );
      },
    });
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
