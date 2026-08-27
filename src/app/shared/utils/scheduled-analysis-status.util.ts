import {
  AdminScheduledAnalysisItem,
  AdminScheduledAnalysisRun,
  ScheduledRunStatus,
} from '../../core/models/scheduled-analysis.model';
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

function isWithinVerdictWaitWindow(run: AdminScheduledAnalysisRun): boolean {
  if (!run.completedAt) {
    return false;
  }
  return Date.now() - new Date(run.completedAt).getTime() < VERDICT_WAIT_WINDOW_MS;
}

export type MailStatus =
  | 'sent'
  | 'waiting_verdict'
  | 'pending_review'
  | 'not_sent'
  | 'error'
  | 'no_runs'
  | 'analysis_failed';

const MAIL_STATUS_LABELS: Record<MailStatus, string> = {
  sent: 'Enviado',
  waiting_verdict: 'Esperando veredicto técnico',
  pending_review: 'Pendiente / revisar',
  not_sent: 'No enviado',
  error: 'Fallido',
  no_runs: 'Sin corridas',
  analysis_failed: 'No aplica: el análisis falló',
};

const MAIL_STATUS_TONES: Record<MailStatus, StatusTone> = {
  sent: 'success',
  waiting_verdict: 'info',
  pending_review: 'warning',
  not_sent: 'neutral',
  error: 'error',
  no_runs: 'neutral',
  analysis_failed: 'neutral',
};

/**
 * Admin PR 3: distingue dos casos reales dentro de `latestRun.status === 'failed'` que antes se
 * mostraban igual — nunca inventa datos, los dos se derivan de columnas que ya existen
 * (ScheduledAnalysisRun.failedAt/errorMessage, ver agro-score-api):
 *
 * - `failedAt` seteado → el ANÁLISIS falló (Analysis.status='Error'), la corrida nunca llegó a
 *   la etapa de mail. No es una falla de mail — `analysis_failed`, tono neutral (el problema está
 *   más arriba en la cadena, no acá).
 * - `failedAt` NULL → el análisis sí terminó bien; el mail se omitió porque el schedule se
 *   desactivó antes de poder enviarlo (ver ScheduledAnalysisRunnerService.reconcileRun). Ahí sí
 *   falló específicamente el mail — `error`.
 */
export function resolveMailStatus(item: AdminScheduledAnalysisItem): MailStatus {
  const run = item.latestRun;

  if (!run) {
    return 'no_runs';
  }

  if (run.emailSentAt) {
    return 'sent';
  }

  if (run.status === 'failed') {
    return run.failedAt ? 'analysis_failed' : 'error';
  }

  if (run.status !== 'completed') {
    return 'not_sent';
  }

  // completed, sin emailSentAt: o está esperando el veredicto (ventana de gracia), o algo quedó
  // trabado más allá de esa ventana y conviene que alguien lo revise.
  if (!item.technicalVerdict) {
    return isWithinVerdictWaitWindow(run) ? 'waiting_verdict' : 'pending_review';
  }

  return 'pending_review';
}

export function mailStatusLabel(item: AdminScheduledAnalysisItem): string {
  return MAIL_STATUS_LABELS[resolveMailStatus(item)];
}

export function mailStatusTone(item: AdminScheduledAnalysisItem): StatusTone {
  return MAIL_STATUS_TONES[resolveMailStatus(item)];
}

// ── Admin PR 6: interpretación de mail POR CORRIDA (historial) ──────────────────────────────

/**
 * Admin PR 6: versión por-corrida de resolveMailStatus — esa opera a nivel de SCHEDULE (la corrida
 * más reciente + su veredicto técnico, para poder distinguir "esperando veredicto" de "atascado").
 * Acá, para el historial de corridas del detalle de campo, se simplifica a 4 baldes (mismo pedido
 * de la ficha): sin necesitar el veredicto de cada corrida individual.
 *
 * - emailSentAt seteado → 'sent'.
 * - `failed` con `failedAt` seteado → falla de PIPELINE (el análisis falló, nunca llegó a la
 *   etapa de mail) → 'not_applicable', mismo criterio que analysis_failed en resolveMailStatus.
 * - `failed` sin `failedAt` → el análisis sí terminó bien, el mail se omitió (schedule
 *   desactivado antes de enviar) → 'failed', caso real y distinguible (PR3).
 * - `completed` sin emailSentAt → 'pending' (todavía no se envió, sea porque está en la ventana
 *   de espera del veredicto o porque quedó trabado — el detalle de campo no distingue esos dos
 *   casos por corrida, ver Programados para ese nivel de detalle).
 * - cualquier otro estado (pending/processing) → 'not_applicable' (todavía no llegó a esa etapa).
 */
export type RunMailStatus = 'sent' | 'pending' | 'failed' | 'not_applicable';

const RUN_MAIL_STATUS_LABELS: Record<RunMailStatus, string> = {
  sent: 'Enviado',
  pending: 'Pendiente',
  failed: 'Mail omitido',
  not_applicable: 'No aplica',
};

const RUN_MAIL_STATUS_TONES: Record<RunMailStatus, StatusTone> = {
  sent: 'success',
  pending: 'warning',
  failed: 'error',
  not_applicable: 'neutral',
};

export function resolveRunMailStatus(run: AdminScheduledAnalysisRun): RunMailStatus {
  if (run.emailSentAt) {
    return 'sent';
  }

  if (run.status === 'failed') {
    return run.failedAt ? 'not_applicable' : 'failed';
  }

  if (run.status === 'completed') {
    return 'pending';
  }

  return 'not_applicable';
}

export function runMailStatusLabel(run: AdminScheduledAnalysisRun): string {
  return RUN_MAIL_STATUS_LABELS[resolveRunMailStatus(run)];
}

export function runMailStatusTone(run: AdminScheduledAnalysisRun): StatusTone {
  return RUN_MAIL_STATUS_TONES[resolveRunMailStatus(run)];
}

// ── Admin PR 3: estado del flujo end-to-end ──────────────────────────────────────────────────

export type FlowStageState = 'ok' | 'pending' | 'missing' | 'failed' | 'not_applicable';

export interface FlowStage {
  label: string;
  state: FlowStageState;
  text: string;
}

export interface FlowState {
  run: FlowStage;
  analysis: FlowStage;
  technicalVerdict: FlowStage;
  weeklyVerdict: FlowStage;
  mail: FlowStage;
  /** Texto determinístico, no generado por IA — primer punto de la cadena que no está "ok". */
  blockingReason: string;
  /** Estado del eslabón que generó blockingReason — para colorear el badge del resumen por fila. */
  blockingState: FlowStageState;
}

const FLOW_STAGE_TONES: Record<FlowStageState, StatusTone> = {
  ok: 'success',
  pending: 'info',
  missing: 'neutral',
  failed: 'error',
  not_applicable: 'neutral',
};

export function flowStageTone(state: FlowStageState): StatusTone {
  return FLOW_STAGE_TONES[state];
}

const FLOW_STATE_BADGE_LABELS: Record<FlowStageState, string> = {
  ok: 'Al día',
  pending: 'En curso',
  missing: 'Sin datos',
  failed: 'Atención',
  not_applicable: 'No aplica',
};

/** Etiqueta corta para el badge de "Estado del flujo" — describe el eslabón bloqueante, no una
 * etapa puntual (evita, por ejemplo, mostrar "Completada" con tono de error). */
export function flowStateBadgeLabel(state: FlowStageState): string {
  return FLOW_STATE_BADGE_LABELS[state];
}

function resolveRunStage(run: AdminScheduledAnalysisRun | null): FlowStage {
  if (!run) {
    return { label: 'Corrida', state: 'missing', text: 'Sin corridas' };
  }
  if (run.status === 'failed') {
    return { label: 'Corrida', state: 'failed', text: 'Fallida' };
  }
  if (run.status === 'pending' || run.status === 'processing') {
    return { label: 'Corrida', state: 'pending', text: runStatusLabel(run.status) };
  }
  return { label: 'Corrida', state: 'ok', text: 'Completada' };
}

/**
 * `latestRun.status` solo llega a 'completed' cuando el Analysis terminó Finalizado (ver
 * ScheduledAnalysisRunnerService.reconcileRun) — así que 'failed' con `failedAt` seteado es la
 * única falla real de análisis. 'failed' SIN `failedAt` es la corrida cuyo mail se omitió después
 * de que el análisis ya había salido bien — ver resolveMailStatus más arriba, mismo criterio.
 */
function resolveAnalysisStage(run: AdminScheduledAnalysisRun | null): FlowStage {
  if (!run) {
    return { label: 'Análisis', state: 'not_applicable', text: 'No aplica' };
  }
  if (run.status === 'failed' && run.failedAt) {
    return { label: 'Análisis', state: 'failed', text: 'No generado' };
  }
  if (run.status === 'pending' || run.status === 'processing') {
    return { label: 'Análisis', state: 'pending', text: 'En proceso' };
  }
  return { label: 'Análisis', state: 'ok', text: 'Generado' };
}

function resolveVerdictStage(
  item: AdminScheduledAnalysisItem,
  analysisStage: FlowStage,
  run: AdminScheduledAnalysisRun | null,
): FlowStage {
  if (analysisStage.state !== 'ok') {
    return { label: 'Veredicto técnico', state: 'not_applicable', text: 'No aplica' };
  }

  const verdict = item.technicalVerdict;
  if (!verdict) {
    const waiting = run ? isWithinVerdictWaitWindow(run) : false;
    return waiting
      ? { label: 'Veredicto técnico', state: 'pending', text: 'Generándose' }
      : { label: 'Veredicto técnico', state: 'missing', text: 'No disponible' };
  }
  if (verdict.status === 'generated') {
    return { label: 'Veredicto técnico', state: 'ok', text: 'Disponible' };
  }
  if (verdict.status === 'failed') {
    return { label: 'Veredicto técnico', state: 'failed', text: 'No se pudo generar' };
  }
  return { label: 'Veredicto técnico', state: 'pending', text: 'Generándose' };
}

/**
 * A diferencia del veredicto individual, el diagnóstico semanal se genera de forma SÍNCRONA
 * dentro del mismo reconcileRun que crea el snapshot (ver PR 16B/16C en agro-score-api) — no hay
 * ventana de espera propia acá: si no existe y el análisis salió bien, es porque falló
 * (best-effort) o no se generó, nunca por una carrera con el próximo tick.
 */
function resolveWeeklyStage(
  item: AdminScheduledAnalysisItem,
  analysisStage: FlowStage,
): FlowStage {
  if (analysisStage.state !== 'ok') {
    return { label: 'Diagnóstico semanal', state: 'not_applicable', text: 'No aplica' };
  }

  const weekly = item.weeklyTechnicalVerdict;
  if (!weekly) {
    return { label: 'Diagnóstico semanal', state: 'missing', text: 'No disponible' };
  }
  if (weekly.status === 'generated') {
    return { label: 'Diagnóstico semanal', state: 'ok', text: 'Disponible' };
  }
  if (weekly.status === 'failed') {
    return { label: 'Diagnóstico semanal', state: 'failed', text: 'No se pudo generar' };
  }
  return { label: 'Diagnóstico semanal', state: 'pending', text: 'Generándose' };
}

const MAIL_FLOW_STATE: Record<MailStatus, FlowStageState> = {
  sent: 'ok',
  waiting_verdict: 'pending',
  pending_review: 'pending',
  not_sent: 'pending',
  error: 'failed',
  no_runs: 'not_applicable',
  analysis_failed: 'not_applicable',
};

function resolveMailStage(item: AdminScheduledAnalysisItem): FlowStage {
  return {
    label: 'Mail',
    state: MAIL_FLOW_STATE[resolveMailStatus(item)],
    text: mailStatusLabel(item),
  };
}

/**
 * Camina la cadena en orden (Corrida → Análisis → Veredicto técnico → Diagnóstico semanal →
 * Mail) y devuelve el texto del PRIMER eslabón que no está "ok" — determinístico, sin IA, mismas
 * 7 frases que pidió la auditoría (más un par de variantes "en proceso" para los estados
 * intermedios que la auditoría no listó explícitamente).
 */
function resolveBlockingReason(
  item: AdminScheduledAnalysisItem,
  run: FlowStage,
  analysis: FlowStage,
  verdict: FlowStage,
  weekly: FlowStage,
  mail: FlowStage,
): { text: string; state: FlowStageState } {
  if (run.state === 'missing') {
    return { text: 'Este monitoreo todavía no registra corridas.', state: 'missing' };
  }
  if (run.state === 'pending') {
    return { text: 'La corrida más reciente todavía se está ejecutando.', state: 'pending' };
  }
  if (analysis.state === 'failed') {
    return { text: 'La última corrida falló antes de generar análisis.', state: 'failed' };
  }
  if (verdict.state === 'missing') {
    return {
      text: 'El análisis existe, pero el veredicto técnico no fue generado.',
      state: 'missing',
    };
  }
  if (verdict.state === 'failed') {
    return { text: 'El análisis existe, pero el veredicto técnico falló.', state: 'failed' };
  }
  if (verdict.state === 'pending') {
    return {
      text: 'El análisis existe; el veredicto técnico todavía se está generando.',
      state: 'pending',
    };
  }
  if (weekly.state === 'missing') {
    return { text: 'El diagnóstico semanal no está disponible.', state: 'missing' };
  }
  if (weekly.state === 'failed') {
    return { text: 'El diagnóstico semanal no se pudo generar.', state: 'failed' };
  }
  if (mail.state === 'ok') {
    return { text: 'El mail fue enviado correctamente.', state: 'ok' };
  }
  if (mail.state === 'failed') {
    const text = item.latestRun?.errorMessage
      ? `El mail falló: ${item.latestRun.errorMessage}`
      : 'El mail falló.';
    return { text, state: 'failed' };
  }
  // mail.state === 'pending' (o, residualmente, 'not_applicable' si el análisis falló y ya se
  // reportó arriba) — la corrida terminó bien pero el mail todavía no salió.
  return { text: 'El mail todavía no fue enviado.', state: 'pending' };
}

export function resolveFlowState(item: AdminScheduledAnalysisItem): FlowState {
  const run = item.latestRun;

  const runStage = resolveRunStage(run);
  const analysisStage = resolveAnalysisStage(run);
  const verdictStage = resolveVerdictStage(item, analysisStage, run);
  const weeklyStage = resolveWeeklyStage(item, analysisStage);
  const mailStage = resolveMailStage(item);

  const blocking = resolveBlockingReason(
    item,
    runStage,
    analysisStage,
    verdictStage,
    weeklyStage,
    mailStage,
  );

  return {
    run: runStage,
    analysis: analysisStage,
    technicalVerdict: verdictStage,
    weeklyVerdict: weeklyStage,
    mail: mailStage,
    blockingReason: blocking.text,
    blockingState: blocking.state,
  };
}
