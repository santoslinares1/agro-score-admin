import { Component, input } from '@angular/core';

export type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="'badge--' + tone()">{{ label() }}</span>`,
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
}
