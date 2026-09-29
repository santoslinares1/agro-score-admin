import { AnalysisStatus } from '../../core/models/analysis.model';
import { StatusTone } from '../components/status-badge/status-badge.component';

export function analysisStatusTone(status: AnalysisStatus | null | undefined): StatusTone {
  switch (status) {
    case 'Finalizado':
      return 'success';
    case 'Error':
      return 'error';
    // ADR-001: 'Queued' (en cola) comparte el tono no terminal de 'Procesando'.
    case 'Queued':
    case 'Procesando':
      return 'info';
    default:
      return 'neutral';
  }
}

const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  Queued: 'En cola',
  Procesando: 'Procesando',
  Finalizado: 'Finalizado',
  Error: 'Error',
};

/** ADR-001: texto visible del status — nunca el valor técnico 'Queued'. */
export function analysisStatusLabel(status: AnalysisStatus | null | undefined): string {
  return status ? (ANALYSIS_STATUS_LABELS[status] ?? status) : '';
}
