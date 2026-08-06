import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminAuditLog } from '../../core/models/audit-log.model';
import { AdminUser } from '../../core/models/user.model';
import { AuditLogsService } from '../../core/services/audit-logs.service';
import { UsersService } from '../../core/services/users.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import {
  getAuditActionLabel,
  getKnownAuditActions,
  getKnownTargetTypes,
  getTargetTypeLabel,
} from '../../shared/utils/audit-action.util';
import { formatJson } from '../../shared/utils/redact-sensitive.util';

const PAGE_LIMIT = 20;

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [DatePipe, FormsModule, PaginationControlsComponent],
  templateUrl: './audit-logs.component.html',
  styleUrl: '../shared-list.component.css',
})
export class AuditLogsComponent implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly usersService = inject(UsersService);

  protected readonly knownActions = getKnownAuditActions();
  protected readonly knownTargetTypes = getKnownTargetTypes();
  protected readonly actionLabel = getAuditActionLabel;
  protected readonly targetTypeLabel = getTargetTypeLabel;

  protected readonly items = signal<AdminAuditLog[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected action = '';
  protected targetType = '';
  protected actorUserId = '';
  protected targetId = '';

  // id -> "Nombre (email)", solo para pintar el actor de forma legible. Si
  // el actor no está en esta primera página de usuarios (más de 100, o fue
  // desactivado), se muestra el UUID crudo — no bloquea nada.
  private readonly actorLabels = signal<Record<string, string>>({});

  protected readonly selected = signal<AdminAuditLog | null>(null);

  ngOnInit(): void {
    this.load();
    this.usersService.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => {
        const labels: Record<string, string> = {};
        result.items.forEach((u: AdminUser) => {
          labels[u.id] = `${u.fullName} (${u.email})`;
        });
        this.actorLabels.set(labels);
      },
      error: () => undefined,
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auditLogsService
      .list({
        page: this.page(),
        limit: this.limit,
        action: this.action || undefined,
        targetType: this.targetType || undefined,
        actorUserId: this.actorUserId.trim() || undefined,
        targetId: this.targetId.trim() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(apiErrorMessage(err, 'No se pudo cargar el registro de auditoría.'));
          this.loading.set(false);
        },
      });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  protected clearFilters(): void {
    this.action = '';
    this.targetType = '';
    this.actorUserId = '';
    this.targetId = '';
    this.applyFilters();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected actorDisplay(actorUserId: string | null): string {
    if (!actorUserId) {
      return '—';
    }

    return this.actorLabels()[actorUserId] ?? actorUserId;
  }

  protected openDetail(log: AdminAuditLog): void {
    this.selected.set(log);
  }

  protected closeDetail(): void {
    this.selected.set(null);
  }

  protected formatJson(value: unknown): string {
    return formatJson(value);
  }
}
