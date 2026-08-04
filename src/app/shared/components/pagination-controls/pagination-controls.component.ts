import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  template: `
    <div class="pagination">
      <button type="button" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">
        ← Anterior
      </button>
      <span class="pagination__info">
        Página {{ page() }} de {{ totalPages() }} · {{ total() }} resultados
      </span>
      <button
        type="button"
        [disabled]="page() >= totalPages()"
        (click)="pageChange.emit(page() + 1)"
      >
        Siguiente →
      </button>
    </div>
  `,
  styleUrl: './pagination-controls.component.css',
})
export class PaginationControlsComponent {
  readonly page = input.required<number>();
  readonly limit = input.required<number>();
  readonly total = input.required<number>();

  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
}
