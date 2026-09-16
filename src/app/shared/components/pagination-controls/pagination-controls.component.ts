import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  template: `
    <div class="flex items-center justify-center gap-4 py-4 text-sm text-muted">
      <button
        type="button"
        class="cursor-pointer rounded-md border border-border bg-surface px-[0.8rem] py-[0.4rem] text-foreground enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="page() <= 1"
        (click)="pageChange.emit(page() - 1)"
      >
        ← Anterior
      </button>
      <span> Página {{ page() }} de {{ totalPages() }} · {{ total() }} resultados </span>
      <button
        type="button"
        class="cursor-pointer rounded-md border border-border bg-surface px-[0.8rem] py-[0.4rem] text-foreground enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="page() >= totalPages()"
        (click)="pageChange.emit(page() + 1)"
      >
        Siguiente →
      </button>
    </div>
  `,
})
export class PaginationControlsComponent {
  readonly page = input.required<number>();
  readonly limit = input.required<number>();
  readonly total = input.required<number>();

  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
}
