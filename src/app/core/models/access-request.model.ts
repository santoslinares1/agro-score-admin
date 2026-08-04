export type AccessRequestStatus = 'new' | 'contacted' | 'discarded';

export type AccessRequestProfile =
  | 'producer'
  | 'advisor'
  | 'consultancy'
  | 'agro_company'
  | 'other';

export const ACCESS_REQUEST_PROFILE_LABELS: Record<AccessRequestProfile, string> = {
  producer: 'Productor',
  advisor: 'Asesor',
  consultancy: 'Consultora',
  agro_company: 'Empresa agro',
  other: 'Otro',
};

export interface AdminAccessRequest {
  id: string;
  name: string;
  email: string;
  organization: string;
  profile: AccessRequestProfile;
  estimatedSurface?: string | null;
  message?: string | null;
  status: AccessRequestStatus;
  createdAt: string;
}
