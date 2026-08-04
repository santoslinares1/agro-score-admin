import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { AdminLot } from '../../core/models/lot.model';
import { LotsService } from '../../core/services/lots.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [DatePipe, PaginationControlsComponent],
  templateUrl: './lots.component.html',
  styleUrl: '../shared-list.component.css',
})
export class LotsComponent implements OnInit {
  private readonly lotsService = inject(LotsService);

  protected readonly items = signal<AdminLot[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly search = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.lotsService
      .list({ page: this.page(), limit: this.limit, search: this.search() || undefined })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de lotes.');
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }
}
