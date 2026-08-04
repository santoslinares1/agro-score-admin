import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminUser, UserRole } from '../../core/models/user.model';
import { UsersService } from '../../core/services/users.service';
import { PaginationControlsComponent } from '../../shared/components/pagination-controls/pagination-controls.component';

type FormMode = 'create' | 'edit';

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, PaginationControlsComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly fb = inject(FormBuilder);

  protected readonly roles: UserRole[] = ['owner', 'admin', 'user'];

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = PAGE_LIMIT;
  protected readonly search = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

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

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService
      .list({ page: this.page(), limit: this.limit, search: this.search() || undefined })
      .subscribe({
        next: (result) => {
          this.users.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de usuarios.');
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
        this.formError.set(err?.error?.message ?? 'No se pudo guardar el usuario.');
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
        this.errorMessage.set(err?.error?.message ?? 'No se pudo desactivar al usuario.');
      },
    });
  }
}
