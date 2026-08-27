import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IssuedInvitationSummary } from '../../core/models/access-request.model';
import { AdminUser, PasswordResetResult, UserRole } from '../../core/models/user.model';
import { UsersService } from '../../core/services/users.service';
import { CopyableIdComponent } from '../../shared/components/copyable-id/copyable-id.component';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';

type FormMode = 'create' | 'edit';
type ActiveFilter = '' | 'active' | 'inactive';

const PAGE_LIMIT = 20;
// ADMIN-2: el backend no soporta filtrar /admin/users por rol/isActive
// server-side (solo page/limit/search — ver docs/admin-backend.md). Cuando
// alguno de esos dos filtros está activo, se trae este lote más grande y se
// filtra en el cliente; no escala a miles de usuarios, pero es correcto
// para el volumen actual y no requiere tocar el backend. Ver README.
const CLIENT_FILTER_LIMIT = 100;

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PaginationControlsComponent,
    CopyableIdComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly roles: UserRole[] = ['owner', 'admin', 'user'];

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly search = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly roleFilter = signal<UserRole | ''>('');
  protected readonly activeFilter = signal<ActiveFilter>('');

  // Admin PR 2: trazabilidad — deep link real desde Campos/Diagnósticos/Programados
  // (/users?userId=<uuid>). /users?email=<email> se resuelve reusando el buscador existente
  // (search ya matchea por email vía ILIKE en el backend — ver UsersService.findAllPaginated).
  protected readonly userIdFilter = signal<string | undefined>(undefined);
  protected readonly clientFilterMode = computed(
    () => this.roleFilter() !== '' || this.activeFilter() !== '',
  );
  protected readonly visibleUsers = computed(() => {
    const role = this.roleFilter();
    const active = this.activeFilter();

    return this.users().filter(
      (u) =>
        (!role || u.role === role) &&
        (!active || (active === 'active' ? u.isActive : !u.isActive)),
    );
  });

  protected readonly formOpen = signal(false);
  protected readonly formMode = signal<FormMode>('create');
  protected readonly formError = signal<string | null>(null);
  protected readonly formSubmitting = signal(false);
  protected editingUserId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['user' as UserRole, Validators.required],
    isActive: [true],
  });

  // ── Invitación ──
  protected readonly inviteOpen = signal(false);
  protected readonly inviteSubmitting = signal(false);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly inviteResult = signal<IssuedInvitationSummary | null>(null);
  protected inviteEmail = '';
  protected inviteRole: UserRole = 'user';

  // ── Password reset ──
  protected readonly resetTarget = signal<AdminUser | null>(null);
  protected readonly resetSubmitting = signal(false);
  protected readonly resetError = signal<string | null>(null);
  protected readonly resetResult = signal<PasswordResetResult | null>(null);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const userId = params.get('userId');
    if (userId) {
      this.userIdFilter.set(userId);
    }

    const email = params.get('email');
    if (email) {
      this.search.set(email);
    }

    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const usingClientFilters = this.clientFilterMode();

    this.usersService
      .list({
        page: usingClientFilters ? 1 : this.page(),
        limit: usingClientFilters ? CLIENT_FILTER_LIMIT : this.limit,
        search: this.search() || undefined,
        userId: this.userIdFilter(),
      })
      .subscribe({
        next: (result) => {
          this.users.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(apiErrorMessage(err, 'No se pudo cargar la lista de usuarios.'));
          this.loading.set(false);
        },
      });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }

  protected onRoleFilterChange(value: string): void {
    this.roleFilter.set(value as UserRole | '');
    this.load();
  }

  protected onActiveFilterChange(value: string): void {
    this.activeFilter.set(value as ActiveFilter);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected clearUserIdFilter(): void {
    this.userIdFilter.set(undefined);
    this.page.set(1);
    this.load();
  }

  // ── Alta/edición existente ──

  protected openCreateForm(): void {
    this.formMode.set('create');
    this.editingUserId = null;
    this.formError.set(null);
    this.form.reset({ fullName: '', email: '', password: '', role: 'user', isActive: true });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  protected openEditForm(user: AdminUser): void {
    this.formMode.set('edit');
    this.editingUserId = user.id;
    this.formError.set(null);
    this.form.reset({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    // La password no se edita desde acá (ver UpdateAdminUserDto en el backend).
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    const { fullName, email, password, role, isActive } = this.form.getRawValue();

    const request$ =
      this.formMode() === 'create'
        ? this.usersService.create({ fullName, email, password, role, isActive })
        : this.usersService.update(this.editingUserId as string, { fullName, email, role, isActive });

    request$.subscribe({
      next: () => {
        this.formSubmitting.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.formSubmitting.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar el usuario.'));
      },
    });
  }

  protected deactivate(user: AdminUser): void {
    if (!confirm(`¿Desactivar a ${user.fullName} (${user.email})? Va a perder acceso al sistema.`)) {
      return;
    }

    this.usersService.deactivate(user.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.errorMessage.set(apiErrorMessage(err, 'No se pudo desactivar al usuario.'));
      },
    });
  }

  // ── Invitación ──

  protected openInvite(): void {
    this.inviteEmail = '';
    this.inviteRole = 'user';
    this.inviteError.set(null);
    this.inviteResult.set(null);
    this.inviteOpen.set(true);
  }

  protected closeInvite(): void {
    this.inviteOpen.set(false);
  }

  protected submitInvite(): void {
    if (!this.inviteEmail.trim()) {
      return;
    }

    this.inviteSubmitting.set(true);
    this.inviteError.set(null);

    this.usersService
      .createInvitation({ email: this.inviteEmail.trim(), role: this.inviteRole })
      .subscribe({
        next: (result) => {
          this.inviteSubmitting.set(false);
          this.inviteResult.set(result);
        },
        error: (err) => {
          this.inviteSubmitting.set(false);
          this.inviteError.set(apiErrorMessage(err, 'No se pudo crear la invitación.'));
        },
      });
  }

  // ── Password reset ──

  protected openReset(user: AdminUser): void {
    if (!confirm(`¿Generar un token de reset de contraseña para ${user.email}?`)) {
      return;
    }

    this.resetTarget.set(user);
    this.resetError.set(null);
    this.resetResult.set(null);
    this.resetSubmitting.set(true);

    this.usersService.requestPasswordReset(user.id).subscribe({
      next: (result) => {
        this.resetSubmitting.set(false);
        this.resetResult.set(result);
      },
      error: (err) => {
        this.resetSubmitting.set(false);
        this.resetError.set(apiErrorMessage(err, 'No se pudo generar el reset de contraseña.'));
      },
    });
  }

  protected closeReset(): void {
    this.resetTarget.set(null);
  }
}
