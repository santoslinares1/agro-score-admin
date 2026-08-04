import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import {
  AccessRequestStatus,
  ACCESS_REQUEST_PROFILE_LABELS,
  AdminAccessRequest,
} from '../../core/models/access-request.model';
import { AccessRequestsService } from '../../core/services/access-requests.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  ACCESS_REQUEST_STATUS_LABELS,
  accessRequestStatusTone,
} from '../../shared/utils/access-request-status.util';

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-access-requests',
  standalone: true,
  imports: [DatePipe, PaginationControlsComponent, StatusBadgeComponent],
  templateUrl: './access-requests.component.html',
  styleUrl: '../shared-list.component.css',
})
export class AccessRequestsComponent implements OnInit {
  private readonly accessRequestsService = inject(AccessRequestsService);

  protected readonly statuses: AccessRequestStatus[] = ['new', 'contacted', 'discarded'];
  protected readonly statusLabels = ACCESS_REQUEST_STATUS_LABELS;
  protected readonly profileLabels = ACCESS_REQUEST_PROFILE_LABELS;
  protected readonly statusTone = accessRequestStatusTone;

  protected readonly items = signal<AdminAccessRequest[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly status = signal<AccessRequestStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.accessRequestsService
      .list({ page: this.page(), limit: this.limit, status: this.status() || undefined })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de solicitudes de acceso.');
          this.loading.set(false);
        },
      });
  }

  protected onStatusChange(value: string): void {
    this.status.set(value as AccessRequestStatus | '');
    this.page.set(1);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }
}
