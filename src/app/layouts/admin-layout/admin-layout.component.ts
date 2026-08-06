import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/users', label: 'Usuarios' },
    { path: '/access-requests', label: 'Solicitudes' },
    { path: '/fields', label: 'Campos' },
    { path: '/lots', label: 'Lotes' },
    { path: '/analysis', label: 'Diagnósticos' },
    { path: '/audit-logs', label: 'Auditoría' },
    { path: '/system', label: 'Sistema' },
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
