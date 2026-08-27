import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AdminUserDetail } from '../../../core/models/user-detail.model';
import { UserDetailService } from '../../../core/services/user-detail.service';
import { UserDetailComponent } from './user-detail.component';

function buildDetail(overrides: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    user: {
      id: 'user-1',
      email: 'ana@example.com',
      fullName: 'Ana Test',
      role: 'user',
      isActive: true,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    summary: {
      fieldsCount: 0,
      lotsCount: 0,
      analysesCount: 0,
      completedAnalysesCount: 0,
      failedAnalysesCount: 0,
      fieldsWithoutAnalysisCount: 0,
      fieldsRequiringAttentionCount: 0,
      activeSchedulesCount: 0,
      schedulesWithoutRunsCount: 0,
      sentEmailsCount: 0,
    },
    fields: [],
    recentAnalyses: [],
    scheduledAnalysis: [],
    recentAuditLogs: [],
    ...overrides,
  };
}

describe('UserDetailComponent (Admin PR 7)', () => {
  let fixture: ComponentFixture<UserDetailComponent>;
  let serviceSpy: jasmine.SpyObj<UserDetailService>;

  function setup(
    config: {
      detail?: AdminUserDetail;
      error?: HttpErrorResponse;
      pending?: Subject<AdminUserDetail>;
      userId?: string;
    } = {},
  ): void {
    serviceSpy = jasmine.createSpyObj('UserDetailService', ['get']);

    if (config.pending) {
      serviceSpy.get.and.returnValue(config.pending.asObservable());
    } else if (config.error) {
      serviceSpy.get.and.returnValue(throwError(() => config.error));
    } else {
      serviceSpy.get.and.returnValue(of(config.detail ?? buildDetail()));
    }

    TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        provideRouter([]),
        { provide: UserDetailService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ userId: config.userId ?? 'user-1' }) },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(UserDetailComponent);
    fixture.detectChanges();
  }

  it('lee el userId de la ruta y llama a UserDetailService.get (1)', () => {
    setup({ userId: 'user-9' });
    expect(serviceSpy.get).toHaveBeenCalledWith('user-9');
  });

  it('renderiza el estado de carga mientras la respuesta no llegó (2)', () => {
    const pending = new Subject<AdminUserDetail>();
    setup({ pending });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando');
  });

  it('renderiza un mensaje humano de "no encontrado" en un 404 (3)', () => {
    setup({ error: new HttpErrorResponse({ status: 404 }) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Usuario no encontrado');
    expect(el.textContent).not.toContain('404');
  });

  it('renderiza un mensaje de error genérico ante un fallo distinto de 404 (3)', () => {
    setup({ error: new HttpErrorResponse({ status: 500 }) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.error-banner')?.textContent).toContain(
      'No se pudo cargar el detalle del usuario.',
    );
  });

  it('renderiza el header con email, rol, estado e ID copiable (4)', () => {
    setup({
      detail: buildDetail({
        user: {
          id: 'user-1',
          email: 'ana@example.com',
          fullName: 'Ana Test',
          role: 'admin',
          isActive: true,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toBe('ana@example.com');
    expect(el.textContent).toContain('Ana Test');
    expect(el.textContent).toContain('Admin');
    expect(el.textContent).toContain('Activo');
    expect(el.querySelector('app-copyable-id')?.textContent).toContain('#user-1…');
  });

  it('renderiza el resumen de cuenta con los conteos del summary (5)', () => {
    setup({
      detail: buildDetail({
        summary: {
          fieldsCount: 3,
          lotsCount: 7,
          analysesCount: 10,
          completedAnalysesCount: 8,
          failedAnalysesCount: 2,
          fieldsWithoutAnalysisCount: 1,
          fieldsRequiringAttentionCount: 1,
          activeSchedulesCount: 2,
          schedulesWithoutRunsCount: 1,
          sentEmailsCount: 5,
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Resumen de cuenta');
    const grid = el.querySelector('.fd-summary-grid');
    expect(grid?.textContent).toContain('3');
    expect(grid?.textContent).toContain('7');
    expect(grid?.textContent).toContain('10');
    expect(grid?.textContent).toContain('5');
  });

  it('renderiza los campos del usuario con link a /fields/:fieldId (6, 7)', () => {
    setup({
      detail: buildDetail({
        fields: [
          {
            id: 'field-1',
            name: 'Campo Norte',
            lotsCount: 2,
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
            analysisStatus: 'completed',
            requiresAttention: false,
            latestAnalysis: null,
            technicalVerdict: null,
            weeklyMonitoring: { active: false, scheduleId: null, nextRunAt: null, lastRunAt: null, hasRuns: false },
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Campo Norte');
    const link = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find(
      (a) => a.getAttribute('href') === '/fields/field-1' && a.textContent?.trim() === 'Campo Norte',
    );
    expect(link).toBeTruthy();
  });

  it('renderiza el estado vacío si el usuario no tiene campos (12)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Este usuario todavía no tiene campos cargados.');
  });

  it('renderiza diagnósticos recientes con link a /analysis?analysisId=<id> (8, 9)', () => {
    setup({
      detail: buildDetail({
        recentAnalyses: [
          {
            id: 'analysis-1',
            fieldId: 'field-1',
            fieldName: 'Campo Norte',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 5000,
            score: 72,
            errorMessage: null,
            reviewedAt: null,
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Diagnósticos recientes');
    expect(el.textContent).toContain('72');
    const link = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find(
      (a) => a.getAttribute('href') === '/analysis?analysisId=analysis-1',
    );
    expect(link).toBeTruthy();
  });

  it('renderiza el estado vacío si no hay diagnósticos (13)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Este usuario todavía no tiene diagnósticos.');
  });

  it('renderiza el monitoreo semanal con estado de mail (10, 11)', () => {
    setup({
      detail: buildDetail({
        scheduledAnalysis: [
          {
            scheduleId: 'schedule-1',
            fieldId: 'field-1',
            fieldName: 'Campo Norte',
            enabled: true,
            frequency: 'weekly',
            nextRunAt: '2026-09-01T09:00:00.000Z',
            lastRunAt: '2026-08-24T09:00:00.000Z',
            hasRuns: true,
            latestRun: {
              id: 'run-1',
              status: 'completed',
              scheduledFor: '2026-08-24',
              analysisId: 'analysis-9',
              analysisStatus: 'Finalizado',
              startedAt: '2026-08-24T09:00:00.000Z',
              completedAt: '2026-08-24T09:05:00.000Z',
              failedAt: null,
              emailSentAt: '2026-08-24T09:10:00.000Z',
              errorMessage: null,
              createdAt: '2026-08-24T09:00:00.000Z',
              updatedAt: '2026-08-24T09:10:00.000Z',
            },
            technicalVerdict: null,
            weeklyTechnicalVerdict: null,
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Monitoreo semanal');
    // resolveRunMailStatus: emailSentAt seteado => 'sent' => label 'Enviado' (mismo criterio PR3/PR6).
    expect(el.textContent).toContain('Enviado');
  });

  it('renderiza "Sin corridas" cuando el schedule todavía no tiene ninguna corrida (11)', () => {
    setup({
      detail: buildDetail({
        scheduledAnalysis: [
          {
            scheduleId: 'schedule-1',
            fieldId: 'field-1',
            fieldName: 'Campo Norte',
            enabled: true,
            frequency: 'weekly',
            nextRunAt: '2026-09-01T09:00:00.000Z',
            lastRunAt: null,
            hasRuns: false,
            latestRun: null,
            technicalVerdict: null,
            weeklyTechnicalVerdict: null,
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Sin corridas');
  });

  it('renderiza el estado vacío si no hay programados (14)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Este usuario no tiene monitoreo semanal configurado.');
  });

  it('renderiza la auditoría relacionada cuando existe (15)', () => {
    setup({
      detail: buildDetail({
        recentAuditLogs: [
          {
            id: 'log-1',
            action: 'admin.user.role_changed',
            actorUserId: 'admin-1',
            actorEmail: 'admin@agroscorelatam.com',
            targetType: 'user',
            targetId: 'user-1',
            createdAt: '2026-08-20T00:00:00.000Z',
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Rol de usuario cambiado');
    expect(el.textContent).toContain('admin@agroscorelatam.com');
  });

  it('renderiza el mensaje honesto de "no disponible" cuando no hay auditoría relacionada (15)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain(
      'No hay actividad administrativa relacionada disponible en esta vista.',
    );
  });

  it('no muestra botones mutantes (Editar/Generar reset/Desactivar) en el detalle (17)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

    expect(buttons).not.toContain('Editar');
    expect(buttons).not.toContain('Generar reset');
    expect(buttons).not.toContain('Desactivar');
  });

  it('los links "Ver campos/diagnósticos/programados" funcionan (18)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).map((a) => ({
      text: a.textContent?.trim(),
      href: a.getAttribute('href'),
    }));

    expect(links).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({ text: 'Ver campos', href: '/fields?userId=user-1' }),
        jasmine.objectContaining({ text: 'Ver diagnósticos', href: '/analysis?userId=user-1' }),
        jasmine.objectContaining({ text: 'Ver programados', href: '/scheduled-analysis?userId=user-1' }),
      ]),
    );
  });

  it('el link "Volver a Usuarios" funciona (19)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    const backLink = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Volver a Usuarios'),
    );

    expect(backLink?.getAttribute('href')).toBe('/users');
  });

  it('no muestra undefined/null/NaN con datos completos (20)', () => {
    setup({
      detail: buildDetail({
        summary: {
          fieldsCount: 1,
          lotsCount: 2,
          analysesCount: 1,
          completedAnalysesCount: 1,
          failedAnalysesCount: 0,
          fieldsWithoutAnalysisCount: 0,
          fieldsRequiringAttentionCount: 0,
          activeSchedulesCount: 1,
          schedulesWithoutRunsCount: 0,
          sentEmailsCount: 1,
        },
        fields: [
          {
            id: 'field-1',
            name: 'Campo Norte',
            lotsCount: 2,
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
            analysisStatus: 'attention',
            requiresAttention: true,
            latestAnalysis: {
              id: 'analysis-1',
              status: 'Finalizado',
              createdAt: '2026-08-10T00:00:00.000Z',
              completedAt: '2026-08-10T01:00:00.000Z',
              durationMs: 4000,
              score: 41,
            },
            technicalVerdict: {
              status: 'generated',
              verdict: 'attention',
              confidence: 'medium',
              summary: 'Zona con variabilidad relevante.',
              keyFindings: [],
              possibleCauses: [],
              recommendations: [],
              limitations: [],
              generatedAt: '2026-08-10T01:05:00.000Z',
              generator: 'deterministic-v1',
              promptVersion: null,
              errorMessage: null,
            },
            weeklyMonitoring: {
              active: true,
              scheduleId: 'schedule-1',
              nextRunAt: '2026-09-01T09:00:00.000Z',
              lastRunAt: '2026-08-24T09:00:00.000Z',
              hasRuns: true,
            },
          },
        ],
        recentAnalyses: [
          {
            id: 'analysis-1',
            fieldId: 'field-1',
            fieldName: 'Campo Norte',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 4000,
            score: 41,
            errorMessage: null,
            reviewedAt: '2026-08-11T00:00:00.000Z',
          },
        ],
        scheduledAnalysis: [
          {
            scheduleId: 'schedule-1',
            fieldId: 'field-1',
            fieldName: 'Campo Norte',
            enabled: true,
            frequency: 'weekly',
            nextRunAt: '2026-09-01T09:00:00.000Z',
            lastRunAt: '2026-08-24T09:00:00.000Z',
            hasRuns: true,
            latestRun: {
              id: 'run-1',
              status: 'completed',
              scheduledFor: '2026-08-24',
              analysisId: 'analysis-9',
              analysisStatus: 'Finalizado',
              startedAt: '2026-08-24T09:00:00.000Z',
              completedAt: '2026-08-24T09:05:00.000Z',
              failedAt: null,
              emailSentAt: '2026-08-24T09:10:00.000Z',
              errorMessage: null,
              createdAt: '2026-08-24T09:00:00.000Z',
              updatedAt: '2026-08-24T09:10:00.000Z',
            },
            technicalVerdict: null,
            weeklyTechnicalVerdict: {
              status: 'generated',
              verdict: 'favorable',
              trend: 'stable',
              confidence: 'medium',
              summary: 'Sin cambios relevantes.',
              keyChanges: [],
              areasToReview: [],
              recommendations: [],
              limitations: [],
              previousSnapshotId: null,
              generatedAt: '2026-08-24T09:12:00.000Z',
              generator: 'deterministic-v1',
              promptVersion: null,
              errorMessage: null,
            },
          },
        ],
        recentAuditLogs: [
          {
            id: 'log-1',
            action: 'admin.user.role_changed',
            actorUserId: 'admin-1',
            actorEmail: 'admin@agroscorelatam.com',
            targetType: 'user',
            targetId: 'user-1',
            createdAt: '2026-08-20T00:00:00.000Z',
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
    expect(el.textContent).not.toContain('NaN');
  });
});
