import { AdminScheduledAnalysisItem, ScheduledRunStatus } from '../../core/models/scheduled-analysis.model';
import { StatusTone } from '../components/status-badge/status-badge.component';

const RUN_STATUS_LABELS: Record<ScheduledRunStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
  email_sent: 'Completado',
};

const RUN_STATUS_TONES: Record<ScheduledRunStatus, StatusTone> = {
  pending: 'neutral',
  processing: 'info',
  completed: 'success',
  failed: 'error',
  email_sent: 'success',
};

export function runStatusLabel(status: ScheduledRunStatus): string {
  return RUN_STATUS_LABELS[status] ?? status;
}

export function runStatusTone(status: ScheduledRunStatus): StatusTone {
  return RUN_STATUS_TONES[status] ?? 'neutral';
}

// PR 13B: mismo criterio que analysisStatusTone en analysis-status.util.ts.
export function scheduleTone(enabled: boolean): StatusTone {
  return enabled ? 'success' : 'neutral';
}

/**
 * PR 13B: mismos 10 minutos que ScheduledAnalysisRunnerService.isWithinVerdictWaitWindow
 * (agro-score-api) — acá es solo para ESTIMAR y mostrar en pantalla qué puede estar pasando, no
 * controla nada real (el runner ya decidió esto del lado del servidor antes de llegar acá).
 */
const VERDICT_WAIT_WINDOW_MS = 10 * 60 * 1000;

export type MailStatus = 'sent' | 'waiting_verdict' | 'pending_review' | 'not_sent' | 'error' | 'no_runs';

const MAIL_STATUS_LABELS: Record<MailStatus, string> = {
  sent: 'Enviado',
  waiting_verdict: 'Esperando veredicto técnico',
  pending_review: 'Pendiente / revisar',
  not_sent: 'No enviado',
  error: 'Error',
  no_runs: 'Sin corridas',
};

const MAIL_STATUS_TONES: Record<MailStatus, StatusTone> = {
  sent: 'success',
  waiting_verdict: 'info',
  pending_review: 'warning',
  not_sent: 'neutral',
  error: 'error',
  no_runs: 'neutral',
};

export function resolveMailStatus(item: AdminScheduledAnalysisItem): MailStatus {
  const run = item.latestRun;

  if (!run) {
    return 'no_runs';
  }

  if (run.emailSentAt) {
    return 'sent';
  }

  if (run.status === 'failed') {
    return 'error';
  }

  if (run.status !== 'completed') {
    return 'not_sent';
  }

  // completed, sin emailSentAt: o está esperando el veredicto (ventana de gracia), o algo quedó
  // trabado más allá de esa ventana y conviene que alguien lo revise.
  if (!item.technicalVerdict) {
    const completedAt = run.completedAt ? new Date(run.completedAt).getTime() : null;
    const withinWindow = completedAt !== null && Date.now() - completedAt < VERDICT_WAIT_WINDOW_MS;
    return withinWindow ? 'waiting_verdict' : 'pending_review';
  }

  return 'pending_review';
}

export function mailStatusLabel(item: AdminScheduledAnalysisItem): string {
  return MAIL_STATUS_LABELS[resolveMailStatus(item)];
}

export function mailStatusTone(item: AdminScheduledAnalysisItem): StatusTone {
  return MAIL_STATUS_TONES[resolveMailStatus(item)];
}
