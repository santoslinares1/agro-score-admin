import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  /**
   * Fix loading global (auditoría final pre-demo): antes de esto, `<router-outlet>` no rendereaba
   * nada mientras la PRIMERA navegación estaba resolviendo — el guard (`adminGuard`, que espera
   * GET /auth/me si todavía no hay sesión restaurada) y el chunk lazy del componente todavía
   * estaban en vuelo. En una carga directa o un refresh de una ruta profunda (ej. /fields/:id,
   * /audit-logs) eso dejaba la pantalla en blanco 2-5s sin ningún indicador.
   *
   * `hasActivatedOnce` arranca en `false` y pasa a `true` la primera vez que `<router-outlet>`
   * activa CUALQUIER componente (incluye /login o /access-denied si el guard redirige ahí) — y
   * nunca vuelve a `false`. Por diseño, esto solo cubre esa primera ventana en blanco: las
   * navegaciones normales dentro de la app (click en el sidebar) siguen mostrando la pantalla
   * anterior hasta que la nueva está lista, como siempre — no hay flash de "Cargando..." en cada
   * click.
   */
  protected readonly hasActivatedOnce = signal(false);

  protected onOutletActivate(): void {
    this.hasActivatedOnce.set(true);
  }
}
