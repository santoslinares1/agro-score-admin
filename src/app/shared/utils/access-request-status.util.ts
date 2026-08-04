import { AccessRequestStatus } from '../../core/models/access-request.model';
import { StatusTone } from '../components/status-badge/status-badge.component';

export function accessRequestStatusTone(status: AccessRequestStatus): StatusTone {
  switch (status) {
    case 'contacted':
      return 'success';
    case 'discarded':
      return 'neutral';
    case 'new':
      return 'warning';
    default:
      return 'neutral';
  }
}

export const ACCESS_REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  discarded: 'Descartada',
};
