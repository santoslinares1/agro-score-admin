import { Component, inject, signal } from '@angular/core';
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
    { path: '/scheduled-analysis', label: 'Programados' },
    { path: '/audit-logs', label: 'Auditoría' },
    { path: '/system', label: 'Sistema' },
  ];

  // UI-1: sidebar off-canvas en pantallas angostas (ver admin-layout.component.css).
  // En desktop no tiene efecto visual (el botón que la controla está oculto).
  protected readonly sidebarOpen = signal(false);

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
