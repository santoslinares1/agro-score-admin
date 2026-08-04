import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Si ya hay sesión de admin/owner válida, no tiene sentido mostrar el login.
    if (this.authService.isAuthenticated()) {
      this.authService.restoreSession().subscribe((user) => {
        if (user && this.authService.isAdmin(user)) {
          this.router.navigate(['/dashboard']);
        }
      });
    }
  }

  submit(): void {
    if (!this.email || !this.password) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (!this.authService.isAdmin(response.user)) {
          // Sesión válida pero sin rol admin/owner: no se limpia acá — se
          // mantiene autenticado y se lo manda a la pantalla dedicada de
          // acceso denegado (que sí puede mostrar su email/logout). Cualquier
          // intento de entrar a una ruta protegida además queda bloqueado
          // por adminGuard, así que no depende únicamente de este redirect.
          this.router.navigate(['/access-denied']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Credenciales inválidas.');
      },
    });
  }
}
