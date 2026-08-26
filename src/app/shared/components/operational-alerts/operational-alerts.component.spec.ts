import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { OperationalAlert } from '../../../core/models/operational-alert.model';
import { OperationalAlertsComponent } from './operational-alerts.component';

function buildAlert(overrides: Partial<OperationalAlert> = {}): OperationalAlert {
  return {
    id: 'test-alert',
    severity: 'critical',
    title: '2 monitoreos semanales activos sin corridas',
    description: 'El flujo semanal todavía no tiene evidencia de ejecución.',
    count: 2,
    actionLabel: 'Ver programados',
    route: '/scheduled-analysis',
    ...overrides,
  };
}

describe('OperationalAlertsComponent (Admin PR 1)', () => {
  function createComponent(alerts: OperationalAlert[]): ComponentFixture<OperationalAlertsComponent> {
    TestBed.configureTestingModule({
      imports: [OperationalAlertsComponent],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(OperationalAlertsComponent);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el título de la sección "Alertas operativas"', () => {
    const fixture = createComponent([]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alertas operativas');
  });

  it('muestra el estado vacío "No hay alertas..." cuando la lista está vacía', () => {
    const fixture = createComponent([]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.empty-state')?.textContent).toContain(
      'No hay alertas operativas relevantes en este momento.',
    );
    expect(el.querySelectorAll('.alert-card').length).toBe(0);
  });

  it('renderiza una card por alerta, con título, descripción y CTA', () => {
    const fixture = createComponent([buildAlert()]);
    const el = fixture.nativeElement as HTMLElement;

    const card = el.querySelector('.alert-card') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('2 monitoreos semanales activos sin corridas');
    expect(card.textContent).toContain('El flujo semanal todavía no tiene evidencia de ejecución.');

    const cta = card.querySelector('.alert-card__action') as HTMLAnchorElement;
    expect(cta.textContent).toContain('Ver programados');
    expect(cta.getAttribute('href')).toBe('/scheduled-analysis');
  });

  it('el CTA de una alerta con queryParams arma el href con el filtro', () => {
    const fixture = createComponent([
      buildAlert({
        route: '/analysis',
        queryParams: { status: 'Error' },
        actionLabel: 'Ver diagnósticos fallidos',
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    const cta = el.querySelector('.alert-card__action') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/analysis?status=Error');
  });

  it('no muestra "undefined"/"null" cuando una alerta no tiene queryParams', () => {
    const fixture = createComponent([buildAlert({ queryParams: undefined })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
  });

  it('pinta la severidad de cada alerta con el tono correspondiente (critical → error, warning → warning)', () => {
    const fixture = createComponent([
      buildAlert({ id: 'a', severity: 'critical' }),
      buildAlert({ id: 'b', severity: 'warning' }),
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const badges = el.querySelectorAll('app-status-badge .badge');

    expect(badges[0].classList).toContain('badge--error');
    expect(badges[1].classList).toContain('badge--warning');
  });
});
