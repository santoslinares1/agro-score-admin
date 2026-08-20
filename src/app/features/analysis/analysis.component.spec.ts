import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminAnalysis } from '../../core/models/analysis.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { UsersService } from '../../core/services/users.service';
import { AnalysisComponent } from './analysis.component';

function buildAnalysis(overrides: Partial<AdminAnalysis> = {}): AdminAnalysis {
  return {
    id: 'analysis-1',
    fieldId: 'field-1',
    fieldName: 'Campo Norte',
    ownerId: 'user-1',
    ownerEmail: 'owner@example.com',
    ownerFullName: 'Owner Test',
    status: 'Error',
    startedAt: '2026-08-01T10:00:00.000Z',
    completedAt: null,
    failedAt: '2026-08-01T10:05:00.000Z',
    durationMs: 300000,
    errorMessage: null,
    reviewedAt: null,
    reviewedByUserId: null,
    retryCount: 0,
    lastRetriedAt: null,
    createdAt: '2026-08-01T09:59:00.000Z',
    ...overrides,
  };
}

function buildResult(items: AdminAnalysis[]): PaginatedResult<AdminAnalysis> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('AnalysisComponent', () => {
  let fixture: ComponentFixture<AnalysisComponent>;
  let analysisServiceSpy: jasmine.SpyObj<AnalysisService>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  function setup(items: AdminAnalysis[]): void {
    analysisServiceSpy.list.and.returnValue(of(buildResult(items)));

    fixture = TestBed.createComponent(AnalysisComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    analysisServiceSpy = jasmine.createSpyObj('AnalysisService', ['list', 'markReviewed', 'retry']);
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['list']);
    usersServiceSpy.list.and.returnValue(of({ items: [], total: 0, page: 1, limit: 100 }));

    TestBed.configureTestingModule({
      imports: [AnalysisComponent],
      providers: [
        { provide: AnalysisService, useValue: analysisServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
      ],
    });
  });

  it('shows a truncated error by default and reveals the full message on "Ver error completo"', () => {
    const longError =
      'Earth Engine timeout: no se pudo completar la consulta de imágenes satelitales para el rango de fechas solicitado tras 3 reintentos internos.';
    setup([buildAnalysis({ errorMessage: longError })]);

    const el = fixture.nativeElement as HTMLElement;
    const cell = el.querySelector('.error-cell') as HTMLElement;
    expect(cell.textContent).toContain(longError);
    expect(cell.classList).not.toContain('error-cell--expanded');

    const toggle = cell.querySelector('button') as HTMLButtonElement;
    expect(toggle.textContent?.trim()).toBe('Ver error completo');

    toggle.click();
    fixture.detectChanges();

    expect(cell.classList).toContain('error-cell--expanded');
    expect(toggle.textContent?.trim()).toBe('Ocultar');
  });

  it('shows "Sin error registrado" and no toggle button when the analysis has no error', () => {
    setup([buildAnalysis({ status: 'Finalizado', errorMessage: null })]);

    const el = fixture.nativeElement as HTMLElement;
    const cell = el.querySelector('.error-cell') as HTMLElement;

    expect(cell.textContent).toContain('Sin error registrado');
    expect(cell.querySelector('button')).toBeNull();
  });

  it('renders "Procesando" with the info (blue/indigo) tone, not the warning tone used elsewhere', () => {
    setup([buildAnalysis({ status: 'Procesando', errorMessage: null })]);

    const el = fixture.nativeElement as HTMLElement;
    const badge = el.querySelector('app-status-badge .badge');

    expect(badge?.classList).toContain('badge--info');
    expect(badge?.classList).not.toContain('badge--warning');
  });

  it('expands and collapses each row error independently without affecting other rows', () => {
    setup([
      buildAnalysis({ id: 'a1', errorMessage: 'Error corto A' }),
      buildAnalysis({ id: 'a2', errorMessage: 'Error corto B' }),
    ]);

    const el = fixture.nativeElement as HTMLElement;
    const cells = el.querySelectorAll('.error-cell');
    const firstToggle = cells[0].querySelector('button') as HTMLButtonElement;

    firstToggle.click();
    fixture.detectChanges();

    expect(cells[0].classList).toContain('error-cell--expanded');
    expect(cells[1].classList).not.toContain('error-cell--expanded');
  });
});
