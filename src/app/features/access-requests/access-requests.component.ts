import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AccessRequestStatus,
  ACCESS_REQUEST_PROFILE_LABELS,
  AdminAccessRequest,
  IssuedInvitationSummary,
} from '../../core/models/access-request.model';
import { AdminUser, UserRole } from '../../core/models/user.model';
import { AccessRequestsService } from '../../core/services/access-requests.service';
import { UsersService } from '../../core/services/users.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  ACCESS_REQUEST_STATUS_LABELS,
  accessRequestStatusTone,
} from '../../shared/utils/access-request-status.util';

const PAGE_LIMIT = 20;
const ALL_STATUSES: AccessRequestStatus[] = [
  'new',
  'contacted',
  'interested',
  'discarded',
  'converted',
];
const ALL_ROLES: UserRole[] = ['user', 'admin', 'owner'];

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return message ?? fallback;
}

@Component({
  selector: 'app-access-requests',
  standalone: true,
  imports: [DatePipe, FormsModule, PaginationControlsComponent, StatusBadgeComponent],
  templateUrl: './access-requests.component.html',
  styleUrl: '../shared-list.component.css',
})
export class AccessRequestsComponent implements OnInit {
  private readonly accessRequestsService = inject(AccessRequestsService);
  private readonly usersService = inject(UsersService);

  protected readonly statuses = ALL_STATUSES;
  protected readonly roles = ALL_ROLES;
  protected readonly statusLabels = ACCESS_REQUEST_STATUS_LABELS;
  protected readonly profileLabels = ACCESS_REQUEST_PROFILE_LABELS;
  protected readonly statusTone = accessRequestStatusTone;

  protected readonly items = signal<AdminAccessRequest[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly search = signal('');
  protected readonly status = signal<AccessRequestStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // Usuarios activos para el selector de "asignar responsable" — se carga
  // una vez, no depende de la paginación del listado principal.
  protected readonly assignableUsers = signal<AdminUser[]>([]);

  // ── Modal de detalle/edición ──
  protected readonly selected = signal<AdminAccessRequest | null>(null);
  protected editStatus: AccessRequestStatus = 'new';
  protected editInternalNotes = '';
  protected editAssignedToUserId = '';
  protected readonly detailSaving = signal(false);
  protected readonly detailError = signal<string | null>(null);

  // ── Crear usuario desde solicitud ──
  protected readonly createUserOpen = signal(false);
  protected createUserRole: UserRole = 'user';
  protected readonly createUserSubmitting = signal(false);
  protected readonly createUserError = signal<string | null>(null);
  protected readonly createUserResult = signal<IssuedInvitationSummary | null>(null);
  // Fix (auditoría final pre-demo): antes, "Confirmar creación" ejecutaba la acción de una y
  // dependía de un `window.confirm()` nativo (sin estilo, inconsistente con el resto de la app)
  // como única barrera. Ahora hay un paso explícito e in-app entre elegir el rol y ejecutar:
  // `createUserConfirming` muestra el resumen ("¿Crear usuario para <email>?" + email/nombre/rol)
  // y solo el botón "Crear usuario" de ESE paso llama al servicio.
  protected readonly createUserConfirming = signal(false);

  ngOnInit(): void {
    this.load();
    this.usersService.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => this.assignableUsers.set(result.items.filter((u) => u.isActive)),
      error: () => undefined, // no bloquea la pantalla si esto falla; el select queda vacío
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.accessRequestsService
      .list({
        page: this.page(),
        limit: this.limit,
        status: this.status() || undefined,
        search: this.search() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(apiErrorMessage(err, 'No se pudo cargar la lista de solicitudes de acceso.'));
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
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

  protected assigneeLabel(userId: string | null | undefined): string {
    if (!userId) {
      return '—';
    }

    const user = this.assignableUsers().find((u) => u.id === userId);
    return user ? `${user.fullName} (${user.email})` : userId;
  }

  // ── Detalle ──

  protected openDetail(item: AdminAccessRequest): void {
    this.selected.set(item);
    this.editStatus = item.status;
    this.editInternalNotes = item.internalNotes ?? '';
    this.editAssignedToUserId = item.assignedToUserId ?? '';
    this.detailError.set(null);
    this.createUserOpen.set(false);
    this.createUserConfirming.set(false);
    this.createUserError.set(null);
    this.createUserResult.set(null);
    this.createUserRole = 'user';
  }

  protected closeDetail(): void {
    this.selected.set(null);
  }

  protected saveDetail(): void {
    const current = this.selected();
    if (!current) {
      return;
    }

    this.detailSaving.set(true);
    this.detailError.set(null);

    this.accessRequestsService
      .update(current.id, {
        status: this.editStatus,
        internalNotes: this.editInternalNotes,
        // NOTA: si editAssignedToUserId queda vacío ("Sin asignar"), no se
        // manda el campo — el backend no tiene forma de "desasignar" hoy
        // (el DTO valida UUID si el campo viene, no acepta null). Un
        // responsable ya asignado solo se puede reemplazar por otro, no
        // vaciar, hasta que se sume esa capacidad al backend.
        ...(this.editAssignedToUserId ? { assignedToUserId: this.editAssignedToUserId } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.detailSaving.set(false);
          this.selected.set(updated);
          this.items.update((items) => items.map((i) => (i.id === updated.id ? updated : i)));
        },
        error: (err) => {
          this.detailSaving.set(false);
          this.detailError.set(apiErrorMessage(err, 'No se pudo guardar la solicitud.'));
        },
      });
  }

  // ── Crear usuario desde solicitud ──

  protected openCreateUser(): void {
    this.createUserOpen.set(true);
    this.createUserConfirming.set(false);
    this.createUserError.set(null);
    this.createUserResult.set(null);
  }

  protected cancelCreateUser(): void {
    this.createUserOpen.set(false);
    this.createUserConfirming.set(false);
  }

  // Avanza del selector de rol a la confirmación explícita — todavía no ejecuta nada.
  protected reviewCreateUser(): void {
    this.createUserConfirming.set(true);
  }

  // Desde la confirmación, vuelve al selector de rol sin ejecutar nada.
  protected backToRoleSelect(): void {
    this.createUserConfirming.set(false);
  }

  protected confirmCreateUser(): void {
    const current = this.selected();
    if (!current) {
      return;
    }

    this.createUserSubmitting.set(true);
    this.createUserError.set(null);

    this.accessRequestsService.createUserFromRequest(current.id, { role: this.createUserRole }).subscribe({
      next: (result) => {
        this.createUserSubmitting.set(false);
        this.createUserOpen.set(false);
        this.createUserConfirming.set(false);
        this.createUserResult.set(result.invitation);
        this.selected.set(result.accessRequest);
        this.editStatus = result.accessRequest.status;
        this.items.update((items) =>
          items.map((i) => (i.id === result.accessRequest.id ? result.accessRequest : i)),
        );
      },
      error: (err) => {
        this.createUserSubmitting.set(false);
        this.createUserError.set(
          apiErrorMessage(err, 'No se pudo crear el usuario desde esta solicitud.'),
        );
      },
    });
  }
}
