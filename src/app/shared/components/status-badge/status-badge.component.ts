import { Component, input } from '@angular/core';

export type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

// Mismo tinte (15% del color de marca sobre transparente) que usaban las variantes
// `.badge--*` en CSS, reproducido acá con `color-mix()` para no perder el ajuste
// automático a dark mode que ya resuelven las custom properties de src/styles.css.
// `tone()` es dinámico, así que Tailwind no puede ver un literal `'badge--' + tone()`
// en el template — este mapa centraliza las combinaciones reales en el único lugar
// que las usa, en vez de forzarlas a utilities sueltas repetidas por toda la app.
const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-success',
  error: 'bg-[color-mix(in_srgb,var(--color-error)_15%,transparent)] text-error',
  warning: 'bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-warning',
  info: 'bg-[color-mix(in_srgb,var(--color-info)_15%,transparent)] text-info',
  neutral: 'bg-[color-mix(in_srgb,var(--color-text-muted)_15%,transparent)] text-muted',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span
    class="badge inline-block whitespace-nowrap rounded-full px-[0.6rem] py-[0.15rem] text-xs font-semibold"
    [class]="'badge--' + tone() + ' ' + TONE_CLASSES[tone()]"
    >{{ label() }}</span
  >`,
})
export class StatusBadgeComponent {
  // `badge--{tone}` no lleva CSS propio (los estilos reales vienen de TONE_CLASSES) — se
  // mantiene solo como hook estable para los specs existentes (analysis, operational-alerts)
  // que asertan sobre ese literal.
  protected readonly TONE_CLASSES = TONE_CLASSES;

  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
}
