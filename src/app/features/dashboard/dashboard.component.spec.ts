import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AdminMetrics } from '../../core/models/metrics.model';
import { AdminProductAnalytics } from '../../core/models/product-analytics.model';
import { MetricsService } from '../../core/services/metrics.service';
import { ProductAnalyticsService } from '../../core/services/product-analytics.service';
import { DashboardComponent } from './dashboard.component';

function buildMetrics(overrides: Partial<AdminMetrics> = {}): AdminMetrics {
  return {
    totalUsers: 10,
    activeUsers: 8,
    totalFields: 5,
    totalLots: 12,
    totalAnalysis: 20,
    completedAnalysis: 12,
    failedAnalysis: 3,
    averageAnalysisDurationMs: 45000,
    latestAnalysis: [],
    latestAccessRequests: [],
    ...overrides,
  };
}

// KPIs P0: app-product-analytics (dentro del Dashboard) inyecta su propio
// ProductAnalyticsService — sin este mock, TestBed intenta resolver HttpClient real. Todos los
// tests de este describe usan el mismo fixture "vacío": lo que le pasa a product-analytics no es
// lo que están cubriendo, eso vive en product-analytics.component.spec.ts.
function buildEmptyProductAnalytics(): AdminProductAnalytics {
  const week = { weekStart: '2026-08-31', weekEnd: '2026-09-06' };
  return {
    generatedAt: new Date().toISOString(),
    period: { week, timezone: 'America/Argentina/Cordoba' },
    coverage: {
      scheduleHistory: { availableFrom: null, complete: false },
      analysisClassificationScan: { scanned: 0, limit: 5000, truncated: false },
      nonCanonicalSchedules: { count: 0 },
      analysisTimingAvailability: { availableFrom: null, complete: false },
    },
    northStar: { week, usableFieldsCount: 0, eligibleFieldsCount: 0, rate: null },
    activation: { eligibleUsersCount: 0, activatedUsersCount: 0, rate: null },
    timeToFirstTechnicalValue: {
      cohortUsersCount: 0,
      activatedUsersCount: 0,
      notActivatedUsersCount: 0,
      p50Hours: null,
      p75Hours: null,
      p95Hours: null,
    },
    retention: {
      week,
      nextWeek: { weekStart: '2026-09-07', weekEnd: '2026-09-13' },
      periodComplete: false,
      sufficientInWeekCount: 0,
      retainedInNextWeekCount: 0,
      rate: null,
    },
    qualityBreakdown: {
      week,
      totalSnapshots: 0,
      breakdown: [
        { status: 'sufficient', count: 0, proportion: null },
        { status: 'partial', count: 0, proportion: null },
        { status: 'insufficient', count: 0, proportion: null },
      ],
    },
  };
}

describe('DashboardComponent', () => {
  function createComponent(metrics: AdminMetrics): ComponentFixture<DashboardComponent> {
    const metricsServiceSpy: jasmine.SpyObj<MetricsService> = jasmine.createSpyObj('MetricsService', [
      'getMetrics',
    ]);
    metricsServiceSpy.getMetrics.and.returnValue(of(metrics));

    const productAnalyticsServiceSpy: jasmine.SpyObj<ProductAnalyticsService> = jasmine.createSpyObj(
      'ProductAnalyticsService',
      ['getProductAnalytics'],
    );
    productAnalyticsServiceSpy.getProductAnalytics.and.returnValue(of(buildEmptyProductAnalytics()));

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: MetricsService, useValue: metricsServiceSpy },
        { provide: ProductAnalyticsService, useValue: productAnalyticsServiceSpy },
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  // UX-001 (agroscore-product-ux-review): app-product-analytics hace su propio fetch de
  // /admin/product-analytics — no depende de /admin/metrics. Este helper simula un fallo
  // exclusivamente en /admin/metrics, con /admin/product-analytics respondiendo bien, para
  // demostrar que ambas secciones reflejan solo el estado de su propio fetch.
  function createComponentWithFailingMetrics(): ComponentFixture<DashboardComponent> {
    const metricsServiceSpy: jasmine.SpyObj<MetricsService> = jasmine.createSpyObj('MetricsService', [
      'getMetrics',
    ]);
    metricsServiceSpy.getMetrics.and.returnValue(throwError(() => new Error('network error')));

    const productAnalyticsServiceSpy: jasmine.SpyObj<ProductAnalyticsService> = jasmine.createSpyObj(
      'ProductAnalyticsService',
      ['getProductAnalytics'],
    );
    productAnalyticsServiceSpy.getProductAnalytics.and.returnValue(of(buildEmptyProductAnalytics()));

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: MetricsService, useValue: metricsServiceSpy },
        { provide: ProductAnalyticsService, useValue: productAnalyticsServiceSpy },
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  // UX-002 (agroscore-product-ux-review): variante que expone el spy de MetricsService y permite
  // controlar cuándo resuelve getMetrics() (vía Subject), para probar el botón "Actualizar" y su
  // estado deshabilitado mientras loading() es true.
  function createComponentWithControlledMetrics(pending?: Subject<AdminMetrics>): {
    fixture: ComponentFixture<DashboardComponent>;
    spy: jasmine.SpyObj<MetricsService>;
  } {
    const metricsServiceSpy: jasmine.SpyObj<MetricsService> = jasmine.createSpyObj('MetricsService', [
      'getMetrics',
    ]);
    metricsServiceSpy.getMetrics.and.returnValue(
      pending ? pending.asObservable() : of(buildMetrics()),
    );

    const productAnalyticsServiceSpy: jasmine.SpyObj<ProductAnalyticsService> = jasmine.createSpyObj(
      'ProductAnalyticsService',
      ['getProductAnalytics'],
    );
    productAnalyticsServiceSpy.getProductAnalytics.and.returnValue(of(buildEmptyProductAnalytics()));

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: MetricsService, useValue: metricsServiceSpy },
        { provide: ProductAnalyticsService, useValue: productAnalyticsServiceSpy },
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, spy: metricsServiceSpy };
  }

  // Selector estructural, no texto: "Actualizando…" NO contiene "Actualizar" como substring
  // (difieren en el 10mo carácter — 'r' vs 'n'), y este componente además renderiza el
  // ProductAnalyticsComponent real anidado, que tiene su PROPIO botón con texto similar —
  // buscar por texto podía encontrar el botón equivocado. `.page-header__actions` es único acá.
  function findRefreshButton(fixture: ComponentFixture<DashboardComponent>): HTMLButtonElement {
    const button = fixture.nativeElement.querySelector(
      '.page-header__actions button',
    ) as HTMLButtonElement | null;
    if (!button) {
      throw new Error('No se encontró el botón de refresco (.page-header__actions button) en el template.');
    }
    return button;
  }

  function processingCardValue(fixture: ComponentFixture<DashboardComponent>): string | null {
    const root = fixture.nativeElement as HTMLElement;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.metric-card'));
    // ADR-001: la card se llama "En curso" (En cola + Procesando), ya no "Procesando".
    const processingCard = cards.find((card) => card.textContent?.includes('En curso'));
    return processingCard?.querySelector('.metric-card__value')?.textContent?.trim() ?? null;
  }

  it('renders an "En curso" KPI card (Queued + Procesando) with the value derived from /admin/metrics (total - completados - fallidos)', () => {
    const fixture = createComponent(
      buildMetrics({ totalAnalysis: 20, completedAnalysis: 12, failedAnalysis: 3 }),
    );

    expect(processingCardValue(fixture)).toBe('5');
  });

  it('never shows a negative "En curso" value when the backend counters are momentarily inconsistent', () => {
    const fixture = createComponent(
      buildMetrics({ totalAnalysis: 10, completedAnalysis: 8, failedAnalysis: 5 }),
    );

    expect(processingCardValue(fixture)).toBe('0');
  });

  describe('Alertas operativas (Admin PR 1)', () => {
    it('renderiza la sección "Alertas operativas" arriba de las cards existentes', () => {
      const fixture = createComponent(buildMetrics({ failedAnalysisLast30Days: 25 }));
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Alertas operativas');
      expect(el.querySelector('.alert-card')).toBeTruthy();
    });

    it('muestra el estado vacío "No hay alertas..." cuando ninguna condición se cumple', () => {
      const fixture = createComponent(buildMetrics());
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('No hay alertas operativas relevantes en este momento.');
      expect(el.querySelectorAll('.alert-card').length).toBe(0);
    });

    it('no rompe ni muestra undefined/null cuando activeSchedulesWithoutRuns/unreviewedFailedAnalysisOlderThan7Days no vienen del backend', () => {
      const fixture = createComponent(buildMetrics({ failedAnalysisLast30Days: 25 }));
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).not.toContain('undefined');
      expect(el.textContent).not.toContain('null');
    });

    it('Admin PR 3: la alerta "schedules activos sin corridas" linkea a /scheduled-analysis?enabled=true&hasRuns=false', () => {
      const fixture = createComponent(buildMetrics({ activeSchedulesWithoutRuns: 2 }));
      const el = fixture.nativeElement as HTMLElement;

      const link = el.querySelector('.alert-card__action') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/scheduled-analysis?enabled=true&hasRuns=false');
    });

    it('sigue renderizando las cards existentes (Usuarios/Campos/Diagnósticos) junto con las alertas', () => {
      const fixture = createComponent(
        buildMetrics({ totalUsers: 10, totalFields: 78, activeSchedulesWithoutRuns: 2 }),
      );
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.alert-card')).toBeTruthy();
      expect(el.textContent).toContain('Usuarios');
      expect(el.textContent).toContain('Campos');
      expect(el.textContent).toContain('Diagnósticos');
    });
  });

  describe('Embudo de uso (Admin PR 4)', () => {
    it('el Dashboard incluye la sección de Product Analytics (app-product-analytics)', () => {
      const fixture = createComponent(buildMetrics());
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-product-analytics')).toBeTruthy();
    });
  });

  describe('UX-001 (agroscore-product-ux-review): app-product-analytics no depende de /admin/metrics', () => {
    it('NEGATIVO: un fallo de /admin/metrics no oculta app-product-analytics, que respondió bien por su cuenta', () => {
      const fixture = createComponentWithFailingMetrics();
      const el = fixture.nativeElement as HTMLElement;

      // El resto del dashboard sí refleja el error de /admin/metrics — no se toca ese comportamiento.
      expect(el.textContent).toContain('No se pudieron cargar las métricas.');
      // Pero app-product-analytics, con su propio fetch exitoso, sigue presente.
      expect(el.querySelector('app-product-analytics')).toBeTruthy();
    });

    it('POSITIVO: con ambos fetches exitosos, el comportamiento no cambia respecto de antes de este fix', () => {
      const fixture = createComponent(buildMetrics());
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-product-analytics')).toBeTruthy();
      expect(el.querySelector('.alert-card, .empty-state')).toBeTruthy();
      expect(el.textContent).toContain('Usuarios');
    });
  });

  describe('UX-002 (agroscore-product-ux-review): botón "Actualizar"', () => {
    it('POSITIVO: clickear "Actualizar" vuelve a llamar a MetricsService.getMetrics()', () => {
      const { fixture, spy } = createComponentWithControlledMetrics();
      spy.getMetrics.calls.reset();
      spy.getMetrics.and.returnValue(of(buildMetrics()));

      findRefreshButton(fixture).click();

      expect(spy.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('NEGATIVO: el botón está deshabilitado mientras loading() es true (no se puede encolar una segunda request)', () => {
      const pending = new Subject<AdminMetrics>();
      const { fixture } = createComponentWithControlledMetrics(pending);

      expect(findRefreshButton(fixture).disabled).toBe(true);

      pending.next(buildMetrics());
      pending.complete();
      fixture.detectChanges();

      expect(findRefreshButton(fixture).disabled).toBe(false);
    });

    it('NEGATIVO / recovery: si /admin/metrics falló, "Actualizar" sigue presente y habilitado para reintentar', () => {
      const fixture = createComponentWithFailingMetrics();

      const button = findRefreshButton(fixture);
      expect(button.disabled).toBe(false);
    });
  });

  describe('UX-003 (agroscore-product-ux-review): orden de secciones', () => {
    it('app-operational-alerts aparece antes que app-product-analytics, que aparece antes que "Usuarios"', () => {
      const fixture = createComponent(buildMetrics({ activeSchedulesWithoutRuns: 2 }));
      const root = fixture.nativeElement as HTMLElement;

      const alerts = root.querySelector('app-operational-alerts');
      const productAnalytics = root.querySelector('app-product-analytics');
      const usuariosSection = Array.from(root.querySelectorAll('.metrics-section')).find((section) =>
        section.querySelector('.metrics-section__title')?.textContent?.includes('Usuarios'),
      );

      expect(alerts).toBeTruthy();
      expect(productAnalytics).toBeTruthy();
      expect(usuariosSection).toBeTruthy();

      // Node.DOCUMENT_POSITION_FOLLOWING (4): el primer argumento aparece ANTES que `this` en el DOM.
      expect(
        alerts!.compareDocumentPosition(productAnalytics!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        productAnalytics!.compareDocumentPosition(usuariosSection!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('no cambia el contenido de ninguna sección — solo el orden (mismo total de usuarios que antes del reorder)', () => {
      const fixture = createComponent(buildMetrics({ totalUsers: 42 }));
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('42');
      expect(el.textContent).toContain('Usuarios');
      expect(el.textContent).toContain('Campos');
      expect(el.textContent).toContain('Diagnósticos');
      expect(el.textContent).toContain('Salud operativa');
      expect(el.textContent).toContain('Solicitudes de acceso');
    });
  });

  describe('UX-004 (agroscore-product-ux-review): cards clickeables reusando rutas filtradas', () => {
    function findCard(fixture: ComponentFixture<DashboardComponent>, label: string): HTMLAnchorElement {
      const cards = Array.from(fixture.nativeElement.querySelectorAll('.metric-card'));
      const card = cards.find((c) =>
        (c as HTMLElement).querySelector('.metric-card__label')?.textContent?.trim() === label,
      ) as HTMLAnchorElement | undefined;
      if (!card) {
        throw new Error(`No se encontró la card "${label}".`);
      }
      return card;
    }

    it('"Campos sin diagnóstico" linkea a /fields?hasAnalysis=false', () => {
      const fixture = createComponent(buildMetrics({ fieldsWithNoAnalysis: 4 }));

      const card = findCard(fixture, 'Campos sin diagnóstico');
      expect(card.tagName).toBe('A');
      expect(card.getAttribute('href')).toBe('/fields?hasAnalysis=false');
    });

    it('NEGATIVO: "Usuarios sin diagnóstico" NO es clickeable — /admin/users no tiene un filtro equivalente', () => {
      const fixture = createComponent(buildMetrics({ usersWithNoAnalysis: 3 }));

      const card = findCard(fixture, 'Usuarios sin diagnóstico');
      expect(card.tagName).toBe('DIV');
      expect(card.getAttribute('routerLink')).toBeNull();
    });

    it('"Fallidos (7 días)" linkea a /analysis?status=Error', () => {
      const fixture = createComponent(buildMetrics({ failedAnalysisLast7Days: 2 }));

      const card = findCard(fixture, 'Fallidos (7 días)');
      expect(card.tagName).toBe('A');
      expect(card.getAttribute('href')).toBe('/analysis?status=Error');
    });

    it('"Fallidos (30 días)" linkea a /analysis?status=Error (mismo filtro sin acotar por fecha, igual que la alerta existente)', () => {
      const fixture = createComponent(buildMetrics({ failedAnalysisLast30Days: 6 }));

      const card = findCard(fixture, 'Fallidos (30 días)');
      expect(card.tagName).toBe('A');
      expect(card.getAttribute('href')).toBe('/analysis?status=Error');
    });

    it('cada badge de "Solicitudes de acceso" linkea a /access-requests?status=<ese estado>', () => {
      const fixture = createComponent(buildMetrics());
      const el = fixture.nativeElement as HTMLElement;

      const items = Array.from(el.querySelectorAll('.status-summary__item')) as HTMLAnchorElement[];
      const hrefs = items.map((item) => item.getAttribute('href'));

      expect(hrefs).toContain('/access-requests?status=new');
      expect(hrefs).toContain('/access-requests?status=contacted');
      expect(hrefs).toContain('/access-requests?status=interested');
      expect(hrefs).toContain('/access-requests?status=converted');
      expect(hrefs).toContain('/access-requests?status=discarded');
    });
  });

  describe('UX-005 (agroscore-product-ux-review): label de "Cuentas habilitadas"', () => {
    it('usa "Cuentas habilitadas" y nunca "Activos" — el dato es isActive=true, no uso reciente', () => {
      const fixture = createComponent(buildMetrics({ activeUsers: 7 }));
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Cuentas habilitadas');
      expect(el.textContent).not.toContain('Activos');
    });

    it('NO-SIDE-EFFECT: el valor mostrado sigue siendo exactamente m.activeUsers, sin transformarlo', () => {
      const fixture = createComponent(buildMetrics({ activeUsers: 7, totalUsers: 10 }));
      const el = fixture.nativeElement as HTMLElement;

      const card = Array.from(el.querySelectorAll('.metric-card')).find((c) =>
        c.querySelector('.metric-card__label')?.textContent?.trim() === 'Cuentas habilitadas',
      );
      expect(card?.querySelector('.metric-card__value')?.textContent?.trim()).toBe('7');
    });
  });
});
