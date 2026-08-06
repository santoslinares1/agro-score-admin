import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { SystemHealth } from '../../core/models/system-health.model';
import { SystemService } from '../../core/services/system.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { healthStatusLabel, healthStatusTone } from '../../shared/utils/health-status.util';
import { formatUptime } from '../../shared/utils/uptime.util';

function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: string | string[] } })?.error?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}

@Component({
  selector: 'app-system',
  standalone: true,
  imports: [DatePipe, StatusBadgeComponent],
  templateUrl: './system.component.html',
  styleUrl: './system.component.css',
})
export class SystemComponent implements OnInit {
  private readonly systemService = inject(SystemService);

  protected readonly health = signal<SystemHealth | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly healthStatusLabel = healthStatusLabel;
  protected readonly healthStatusTone = healthStatusTone;
  protected readonly formatUptime = formatUptime;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.systemService.getHealth().subscribe({
      next: (health) => {
        this.health.set(health);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(apiErrorMessage(err, 'No se pudo consultar el estado del sistema.'));
        this.loading.set(false);
      },
    });
  }

  protected refresh(): void {
    this.load();
  }
}
