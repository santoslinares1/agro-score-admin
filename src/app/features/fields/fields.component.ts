import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { AdminField } from '../../core/models/field.model';
import { FieldsService } from '../../core/services/fields.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-fields',
  standalone: true,
  imports: [DatePipe, PaginationControlsComponent],
  templateUrl: './fields.component.html',
  styleUrl: '../shared-list.component.css',
})
export class FieldsComponent implements OnInit {
  private readonly fieldsService = inject(FieldsService);

  protected readonly items = signal<AdminField[]>([]);
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

    this.fieldsService
      .list({ page: this.page(), limit: this.limit, search: this.search() || undefined })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de campos.');
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
