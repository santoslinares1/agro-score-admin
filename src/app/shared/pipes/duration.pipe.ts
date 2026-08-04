import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) {
      return '—';
    }

    if (ms < 1000) {
      return `${ms} ms`;
    }

    const totalSeconds = Math.round(ms / 1000);

    if (totalSeconds < 60) {
      return `${totalSeconds} s`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
  }
}
