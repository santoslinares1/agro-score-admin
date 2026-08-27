import { Component, input, signal } from '@angular/core';

const COPIED_FEEDBACK_MS = 1500;

/**
 * Admin PR 2: patrón reusable de "ID truncado + botón copiar" — la auditoría pidió esto en vez de
 * mostrar UUIDs completos sueltos en tablas ya densas (userId, fieldId, analysisId, scheduleId,
 * runId). Solo lectura, no navega a ningún lado — para eso están los links reales (.entity-link)
 * sobre nombre/dueño en cada tabla.
 */
@Component({
  selector: 'app-copyable-id',
  standalone: true,
  templateUrl: './copyable-id.component.html',
  styleUrl: './copyable-id.component.css',
})
export class CopyableIdComponent {
  readonly value = input.required<string>();

  protected readonly copied = signal(false);

  protected get shortValue(): string {
    return this.value().slice(0, 8);
  }

  protected async copy(): Promise<void> {
    // navigator.clipboard puede no existir (contexto no seguro) o rechazar (sin permiso/foco) —
    // en cualquiera de los dos casos falla en silencio, nunca rompe la fila. El id truncado con
    // su title completo sigue disponible para copiar a mano igual.
    if (!navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), COPIED_FEEDBACK_MS);
    } catch {
      // Ver comentario de arriba.
    }
  }
}
