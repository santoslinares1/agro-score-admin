import { UserRole } from './user.model';

// ADMIN-2: status ampliado de 3 a 5 valores — ver docs/admin-backend.md en
// agro-score-api.
export type AccessRequestStatus = 'new' | 'contacted' | 'interested' | 'discarded' | 'converted';

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
  internalNotes?: string | null;
  assignedToUserId?: string | null;
  contactedAt?: string | null;
  convertedAt?: string | null;
  discardedAt?: string | null;
  createdAt: string;
}

export interface UpdateAccessRequestPayload {
  status?: AccessRequestStatus;
  internalNotes?: string;
  assignedToUserId?: string;
}

export interface CreateUserFromAccessRequestPayload {
  role?: UserRole;
}

// ADMIN-3: la respuesta nunca incluye password/hash — el usuario se da de
// alta vía invitación. invitationToken/invitationUrl solo vienen si el
// backend NO está en producción (NODE_ENV=production oculta el token por
// completo, ver docs/admin-backend.md en agro-score-api). emailSent/dryRun/
// provider vienen siempre (envío real vía Resend desde ADMIN-3) — el
// frontend arma el mensaje con esos tres campos, ya no con `message`.
export interface IssuedInvitationSummary {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  emailSent: boolean;
  dryRun: boolean;
  provider?: string;
  invitationToken?: string;
  invitationUrl?: string;
  /** @deprecated ADMIN-3: el backend ya no lo manda — se deriva de emailSent/dryRun. */
  message?: string;
}

export interface CreateUserFromAccessRequestResult {
  accessRequest: AdminAccessRequest;
  invitation: IssuedInvitationSummary;
}
