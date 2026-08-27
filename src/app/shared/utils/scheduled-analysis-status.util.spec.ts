import { AnalysisTechnicalVerdict } from '../../core/models/analysis.model';
import {
  AdminScheduledAnalysisItem,
  AdminScheduledAnalysisRun,
  AdminWeeklyTechnicalVerdict,
} from '../../core/models/scheduled-analysis.model';
import {
  mailStatusLabel,
  mailStatusTone,
  resolveFlowState,
  resolveMailStatus,
  resolveRunMailStatus,
} from './scheduled-analysis-status.util';

function buildRun(overrides: Partial<AdminScheduledAnalysisRun> = {}): AdminScheduledAnalysisRun {
  return {
    id: 'run-1',
    status: 'completed',
    scheduledFor: '2026-08-24',
    analysisId: 'analysis-1',
    analysisStatus: 'Finalizado',
    startedAt: '2026-08-24T09:00:00.000Z',
    completedAt: '2026-08-24T09:05:00.000Z',
    failedAt: null,
    emailSentAt: '2026-08-24T09:06:00.000Z',
    errorMessage: null,
    createdAt: '2026-08-24T09:00:00.000Z',
    updatedAt: '2026-08-24T09:06:00.000Z',
    ...overrides,
  };
}

function buildTechnicalVerdict(
  overrides: Partial<AnalysisTechnicalVerdict> = {},
): AnalysisTechnicalVerdict {
  return {
    status: 'generated',
    verdict: 'favorable',
    confidence: 'high',
    summary: 'Resumen.',
    keyFindings: [],
    possibleCauses: [],
    recommendations: [],
    limitations: [],
    generatedAt: '2026-08-24T09:05:30.000Z',
    generator: 'claude',
    promptVersion: 'technical-verdict-v1',
    errorMessage: null,
    ...overrides,
  };
}

function buildWeeklyTechnicalVerdict(
  overrides: Partial<AdminWeeklyTechnicalVerdict> = {},
): AdminWeeklyTechnicalVerdict {
  return {
    status: 'generated',
    verdict: 'favorable',
    trend: 'stable',
    confidence: 'high',
    summary: 'Resumen semanal.',
    keyChanges: [],
    areasToReview: [],
    recommendations: [],
    limitations: [],
    previousSnapshotId: 'snapshot-0',
    generatedAt: '2026-08-24T09:05:30.000Z',
    generator: 'deterministic-v1',
    promptVersion: null,
    errorMessage: null,
    ...overrides,
  };
}

function buildItem(overrides: Partial<AdminScheduledAnalysisItem> = {}): AdminScheduledAnalysisItem {
  return {
    id: 'schedule-1',
    fieldId: 'field-1',
    fieldName: 'Campo Norte',
    userId: 'user-1',
    userEmail: 'owner@example.com',
    userFullName: 'Owner Test',
    enabled: true,
    frequency: 'weekly',
    nextRunAt: '2026-09-01T12:00:00.000Z',
    lastRunAt: '2026-08-24T09:00:00.000Z',
    lastStatus: 'completed',
    lastErrorMessage: null,
    latestRun: buildRun(),
    technicalVerdict: buildTechnicalVerdict(),
    weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict(),
    ...overrides,
  };
}

describe('resolveRunMailStatus (Admin PR 6 — historial de corridas)', () => {
  it('emailSentAt seteado → sent', () => {
    expect(resolveRunMailStatus(buildRun({ emailSentAt: '2026-08-24T09:06:00.000Z' }))).toBe(
      'sent',
    );
  });

  it('completed sin emailSentAt → pending', () => {
    expect(
      resolveRunMailStatus(buildRun({ status: 'completed', emailSentAt: null })),
    ).toBe('pending');
  });

  it('failed con failedAt (falla de pipeline) → not_applicable', () => {
    expect(
      resolveRunMailStatus(
        buildRun({ status: 'failed', failedAt: '2026-08-24T09:03:00.000Z', emailSentAt: null }),
      ),
    ).toBe('not_applicable');
  });

  it('failed sin failedAt (mail omitido, schedule desactivado) → failed', () => {
    expect(
      resolveRunMailStatus(buildRun({ status: 'failed', failedAt: null, emailSentAt: null })),
    ).toBe('failed');
  });

  it('pending/processing → not_applicable (todavía no llegó a la etapa de mail)', () => {
    expect(
      resolveRunMailStatus(buildRun({ status: 'pending', emailSentAt: null })),
    ).toBe('not_applicable');
    expect(
      resolveRunMailStatus(buildRun({ status: 'processing', emailSentAt: null })),
    ).toBe('not_applicable');
  });
});

describe('resolveMailStatus / mailStatusLabel / mailStatusTone (Admin PR 3)', () => {
  it('sin corridas → no_runs', () => {
    const item = buildItem({ latestRun: null });
    expect(resolveMailStatus(item)).toBe('no_runs');
    expect(mailStatusLabel(item)).toBe('Sin corridas');
  });

  it('emailSentAt presente → sent, sin importar el resto', () => {
    const item = buildItem({ latestRun: buildRun({ emailSentAt: '2026-08-24T09:06:00.000Z' }) });
    expect(resolveMailStatus(item)).toBe('sent');
    expect(mailStatusLabel(item)).toBe('Enviado');
    expect(mailStatusTone(item)).toBe('success');
  });

  it('run failed con failedAt seteado → analysis_failed (el análisis falló, nunca llegó a mail)', () => {
    const item = buildItem({
      latestRun: buildRun({
        status: 'failed',
        failedAt: '2026-08-24T09:03:00.000Z',
        emailSentAt: null,
        errorMessage: 'Earth Engine timeout.',
      }),
    });
    expect(resolveMailStatus(item)).toBe('analysis_failed');
    expect(mailStatusLabel(item)).toBe('No aplica: el análisis falló');
    expect(mailStatusTone(item)).toBe('neutral');
  });

  it('run failed con failedAt NULL → error (el mail específicamente falló/se omitió)', () => {
    const item = buildItem({
      latestRun: buildRun({
        status: 'failed',
        failedAt: null,
        emailSentAt: null,
        errorMessage: 'Envío de email omitido: el seguimiento semanal fue desactivado.',
      }),
    });
    expect(resolveMailStatus(item)).toBe('error');
    expect(mailStatusLabel(item)).toBe('Fallido');
    expect(mailStatusTone(item)).toBe('error');
  });

  it('run pending/processing → not_sent', () => {
    expect(resolveMailStatus(buildItem({ latestRun: buildRun({ status: 'pending', emailSentAt: null }) }))).toBe(
      'not_sent',
    );
    expect(
      resolveMailStatus(buildItem({ latestRun: buildRun({ status: 'processing', emailSentAt: null }) })),
    ).toBe('not_sent');
  });

  it('completed sin emailSentAt ni technicalVerdict, dentro de la ventana de 10 min → waiting_verdict', () => {
    const recentCompletedAt = new Date(Date.now() - 60 * 1000).toISOString();
    const item = buildItem({
      latestRun: buildRun({ status: 'completed', completedAt: recentCompletedAt, emailSentAt: null }),
      technicalVerdict: null,
    });
    expect(resolveMailStatus(item)).toBe('waiting_verdict');
  });

  it('completed sin emailSentAt ni technicalVerdict, fuera de la ventana → pending_review', () => {
    const oldCompletedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const item = buildItem({
      latestRun: buildRun({ status: 'completed', completedAt: oldCompletedAt, emailSentAt: null }),
      technicalVerdict: null,
    });
    expect(resolveMailStatus(item)).toBe('pending_review');
  });

  it('completed sin emailSentAt, CON technicalVerdict → pending_review', () => {
    const item = buildItem({
      latestRun: buildRun({ status: 'completed', emailSentAt: null }),
      technicalVerdict: buildTechnicalVerdict(),
    });
    expect(resolveMailStatus(item)).toBe('pending_review');
  });
});

describe('resolveFlowState (Admin PR 3)', () => {
  it('sin corridas: run=missing, el resto not_applicable, blockingReason explica que no hay corridas', () => {
    const flow = resolveFlowState(buildItem({ latestRun: null }));

    expect(flow.run).toEqual({ label: 'Corrida', state: 'missing', text: 'Sin corridas' });
    expect(flow.analysis.state).toBe('not_applicable');
    expect(flow.technicalVerdict.state).toBe('not_applicable');
    expect(flow.weeklyVerdict.state).toBe('not_applicable');
    expect(flow.mail.state).toBe('not_applicable');
    expect(flow.blockingReason).toBe('Este monitoreo todavía no registra corridas.');
  });

  it('corrida en proceso: run=pending, blockingReason lo explica', () => {
    const flow = resolveFlowState(
      buildItem({ latestRun: buildRun({ status: 'processing', emailSentAt: null }) }),
    );

    expect(flow.run.state).toBe('pending');
    expect(flow.blockingReason).toBe('La corrida más reciente todavía se está ejecutando.');
  });

  it('corrida fallida (falló el análisis): analysis=failed, blockingReason lo explica', () => {
    const flow = resolveFlowState(
      buildItem({
        latestRun: buildRun({
          status: 'failed',
          failedAt: '2026-08-24T09:03:00.000Z',
          emailSentAt: null,
        }),
        technicalVerdict: null,
        weeklyTechnicalVerdict: null,
      }),
    );

    expect(flow.run.state).toBe('failed');
    expect(flow.analysis).toEqual({ label: 'Análisis', state: 'failed', text: 'No generado' });
    expect(flow.blockingReason).toBe('La última corrida falló antes de generar análisis.');
  });

  it('análisis generado, sin veredicto técnico, fuera de la ventana de espera: veredicto=missing', () => {
    const oldCompletedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const flow = resolveFlowState(
      buildItem({
        latestRun: buildRun({ completedAt: oldCompletedAt, emailSentAt: null }),
        technicalVerdict: null,
        weeklyTechnicalVerdict: null,
      }),
    );

    expect(flow.analysis.state).toBe('ok');
    expect(flow.technicalVerdict).toEqual({
      label: 'Veredicto técnico',
      state: 'missing',
      text: 'No disponible',
    });
    expect(flow.blockingReason).toBe(
      'El análisis existe, pero el veredicto técnico no fue generado.',
    );
  });

  it('veredicto técnico con status=failed: technicalVerdict=failed, blockingReason lo distingue de "no disponible"', () => {
    const flow = resolveFlowState(
      buildItem({
        technicalVerdict: buildTechnicalVerdict({ status: 'failed', errorMessage: 'Claude 500' }),
        weeklyTechnicalVerdict: null,
      }),
    );

    expect(flow.technicalVerdict.state).toBe('failed');
    expect(flow.blockingReason).toBe('El análisis existe, pero el veredicto técnico falló.');
  });

  it('veredicto disponible, sin diagnóstico semanal: weeklyVerdict=missing', () => {
    const flow = resolveFlowState(buildItem({ weeklyTechnicalVerdict: null }));

    expect(flow.technicalVerdict.state).toBe('ok');
    expect(flow.weeklyVerdict).toEqual({
      label: 'Diagnóstico semanal',
      state: 'missing',
      text: 'No disponible',
    });
    expect(flow.blockingReason).toBe('El diagnóstico semanal no está disponible.');
  });

  it('todo ok, mail enviado: mail=ok, blockingReason confirma envío correcto', () => {
    const flow = resolveFlowState(buildItem());

    expect(flow.run.state).toBe('ok');
    expect(flow.analysis.state).toBe('ok');
    expect(flow.technicalVerdict.state).toBe('ok');
    expect(flow.weeklyVerdict.state).toBe('ok');
    expect(flow.mail).toEqual({ label: 'Mail', state: 'ok', text: 'Enviado' });
    expect(flow.blockingReason).toBe('El mail fue enviado correctamente.');
  });

  it('todo ok salvo el mail (completed sin emailSentAt): mail=pending, blockingReason lo explica', () => {
    const flow = resolveFlowState(
      buildItem({ latestRun: buildRun({ status: 'completed', emailSentAt: null }) }),
    );

    expect(flow.mail.state).toBe('pending');
    expect(flow.blockingReason).toBe('El mail todavía no fue enviado.');
  });

  it('mail específicamente fallido (schedule desactivado antes de enviar): mail=failed con el errorMessage real', () => {
    const flow = resolveFlowState(
      buildItem({
        latestRun: buildRun({
          status: 'failed',
          failedAt: null,
          emailSentAt: null,
          errorMessage: 'Envío de email omitido: el seguimiento semanal fue desactivado.',
        }),
      }),
    );

    expect(flow.analysis.state).toBe('ok');
    expect(flow.mail.state).toBe('failed');
    expect(flow.blockingReason).toBe(
      'El mail falló: Envío de email omitido: el seguimiento semanal fue desactivado.',
    );
  });

  it('mail fallido sin errorMessage disponible: blockingReason no muestra "undefined"', () => {
    const flow = resolveFlowState(
      buildItem({
        latestRun: buildRun({ status: 'failed', failedAt: null, emailSentAt: null, errorMessage: null }),
      }),
    );

    expect(flow.blockingReason).toBe('El mail falló.');
    expect(flow.blockingReason).not.toContain('undefined');
    expect(flow.blockingReason).not.toContain('null');
  });
});
