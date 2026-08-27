import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

@Component({ selector: 'app-test-a', standalone: true, template: 'Página A' })
class TestPageAComponent {}

@Component({ selector: 'app-test-b', standalone: true, template: 'Página B' })
class TestPageBComponent {}

// Fix loading global (auditoría final pre-demo): sin esto, <router-outlet> no rendereaba nada
// mientras la primera navegación (guard + chunk lazy) todavía estaba resolviendo — pantalla en
// blanco 2-5s en cargas directas/refresh de rutas profundas. Ver comentario en app.component.ts.
describe('AppComponent — loading global', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'a', component: TestPageAComponent },
          { path: 'b', component: TestPageBComponent },
        ]),
      ],
    });

    fixture = TestBed.createComponent(AppComponent);
    router = TestBed.inject(Router);
  });

  it('muestra "Cargando…" antes de que la primera navegación active un componente', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.app-shell-loading')?.textContent).toContain('Cargando');
  });

  it('oculta "Cargando…" ni bien el router-outlet activa el primer componente', fakeAsync(() => {
    fixture.detectChanges();
    router.navigateByUrl('/a');
    tick();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.app-shell-loading')).toBeNull();
    expect(el.textContent).toContain('Página A');
  }));

  it('no vuelve a mostrar "Cargando…" en navegaciones posteriores dentro de la app', fakeAsync(() => {
    fixture.detectChanges();
    router.navigateByUrl('/a');
    tick();
    fixture.detectChanges();

    router.navigateByUrl('/b');
    tick();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.app-shell-loading')).toBeNull();
    expect(el.textContent).toContain('Página B');
  }));
});
