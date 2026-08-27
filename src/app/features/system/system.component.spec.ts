import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { SystemHealth } from '../../core/models/system-health.model';
import { SystemService } from '../../core/services/system.service';
import { SystemComponent } from './system.component';

function buildHealth(overrides: Partial<SystemHealth> = {}): SystemHealth {
  return {
    api: { status: 'ok' },
    db: { status: 'ok' },
    worker: { status: 'ok' },
    earthEngine: { status: 'ok' },
    lastSuccessfulAnalysis: {
      id: 'analysis-1',
      fieldId: 'field-1',
      lotName: 'Campo Norte',
      completedAt: '2026-08-24T09:05:00.000Z',
      createdAt: '2026-08-24T09:00:00.000Z',
    },
    lastFailedAnalysis: {
      id: 'analysis-2',
      fieldId: 'field-2',
      lotName: 'Campo Sur',
      failedAt: '2026-08-20T09:05:00.000Z',
      errorMessage: 'Nubosidad excesiva',
      createdAt: '2026-08-20T09:00:00.000Z',
    },
    currentBackendCommit: 'abc1234',
    uptimeSeconds: 3600,
    timestamp: '2026-08-27T10:00:00.000Z',
    ...overrides,
  };
}

// Fix (auditoría final pre-demo): "Completado —" / "Falló —" — sin tests previos que cubrieran
// esta pantalla.
describe('SystemComponent (fix auditoría final)', () => {
  let fixture: ComponentFixture<SystemComponent>;
  let serviceSpy: jasmine.SpyObj<SystemService>;

  function setup(config: { health?: SystemHealth; error?: unknown } = {}): void {
    serviceSpy = jasmine.createSpyObj('SystemService', ['getHealth']);

    if (config.error) {
      serviceSpy.getHealth.and.returnValue(throwError(() => config.error));
    } else {
      serviceSpy.getHealth.and.returnValue(of(config.health ?? buildHealth()));
    }

    TestBed.configureTestingModule({
      imports: [SystemComponent],
      providers: [{ provide: SystemService, useValue: serviceSpy }],
    });

    fixture = TestBed.createComponent(SystemComponent);
    fixture.detectChanges();
  }

  it('renderiza el estado de carga mientras la respuesta no llegó', () => {
    const pending = new Subject<SystemHealth>();
    serviceSpy = jasmine.createSpyObj('SystemService', ['getHealth']);
    serviceSpy.getHealth.and.returnValue(pending.asObservable());
    TestBed.configureTestingModule({
      imports: [SystemComponent],
      providers: [{ provide: SystemService, useValue: serviceSpy }],
    });
    fixture = TestBed.createComponent(SystemComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.loading-state')?.textContent).toContain('Consultando');
  });

  it('renderiza "Completado · fecha" cuando completedAt existe, nunca "Completado —"', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Completado ·');
    expect(el.textContent).not.toContain('Completado —');
  });

  it('renderiza copy humano cuando completedAt no está registrado, nunca "Completado —"', () => {
    setup({
      health: buildHealth({
        lastSuccessfulAnalysis: {
          id: 'analysis-1',
          fieldId: 'field-1',
          lotName: 'Campo Norte',
          completedAt: null,
          createdAt: '2026-08-24T09:00:00.000Z',
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Completado (fecha no registrada)');
    expect(el.textContent).not.toContain('Completado —');
  });

  it('renderiza "Sin diagnósticos exitosos registrados." cuando no hay ninguno', () => {
    setup({ health: buildHealth({ lastSuccessfulAnalysis: null }) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Sin diagnósticos exitosos registrados.');
  });

  it('renderiza "Falló · fecha" cuando failedAt existe, nunca "Falló —"', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Falló ·');
    expect(el.textContent).not.toContain('Falló —');
  });

  it('renderiza copy humano cuando failedAt no está registrado, nunca "Falló —"', () => {
    setup({
      health: buildHealth({
        lastFailedAnalysis: {
          id: 'analysis-2',
          fieldId: 'field-2',
          lotName: 'Campo Sur',
          failedAt: null,
          errorMessage: null,
          createdAt: '2026-08-20T09:00:00.000Z',
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Falló (fecha no registrada)');
    expect(el.textContent).not.toContain('Falló —');
  });

  it('renderiza "Sin diagnósticos fallidos registrados." cuando no hay ninguno', () => {
    setup({ health: buildHealth({ lastFailedAnalysis: null }) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Sin diagnósticos fallidos registrados.');
  });

  it('renderiza un error legible si la consulta falla', () => {
    setup({ error: { error: { message: 'boom' } } });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.error-banner')?.textContent).toContain('boom');
  });
});
