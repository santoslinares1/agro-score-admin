import { AnalysisStatus } from '../../core/models/analysis.model';
import { StatusTone } from '../components/status-badge/status-badge.component';

export function analysisStatusTone(status: AnalysisStatus): StatusTone {
  switch (status) {
    case 'Finalizado':
      return 'success';
    case 'Error':
      return 'error';
    case 'Procesando':
      return 'info';
    default:
      return 'neutral';
  }
}
