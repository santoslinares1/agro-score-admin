export type UserRole = 'owner' | 'admin' | 'user';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  companyName?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * MEASUREMENT GAP P1-06 ("Self-service frente a asistencia"): cuándo un owner/admin marcó
   * explícitamente, desde esta pantalla, que el equipo empezó a asistir MATERIALMENTE a este
   * usuario — nunca inferido de quién creó la cuenta/invitación, ni de ningún otro dato ya
   * existente (ver UserDetailComponent.markAssistanceStarted). `null`/ausente significa "sin
   * marcar" — que puede ser self-service real O simplemente que el equipo todavía no lo marcó;
   * ambos casos son indistinguibles a propósito (ver el ticket de origen), nunca se interpreta acá
   * como self-service. Optional en vez de requerido para no romper los fixtures existentes de
   * AdminUser en el resto del repo (mismo criterio que companyName arriba).
   */
  activationAssistanceStartedAt?: string | null;
}

export interface CreateAdminUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateAdminUserPayload {
  fullName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateInvitationPayload {
  email: string;
  role: UserRole;
}

// ADMIN-3: mismo criterio que IssuedInvitationSummary (access-request.model.ts)
// — resetToken/resetUrl solo vienen si el backend NO está en producción.
// emailSent/dryRun/provider vienen siempre (envío real vía Resend desde
// ADMIN-3). Nunca hay hash ni password acá.
export interface PasswordResetResult {
  userId: string;
  email: string;
  expiresAt: string;
  emailSent: boolean;
  dryRun: boolean;
  provider?: string;
  resetToken?: string;
  resetUrl?: string;
  /** @deprecated ADMIN-3: el backend ya no lo manda — se deriva de emailSent/dryRun. */
  message?: string;
}
