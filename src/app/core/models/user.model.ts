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

// ADMIN-2: mismo criterio que IssuedInvitationSummary (access-request.model.ts)
// — resetToken/resetUrl solo vienen si el backend NO está en producción;
// `message` viene en su lugar cuando no hay token para mostrar. Nunca hay
// hash ni password acá.
export interface PasswordResetResult {
  userId: string;
  email: string;
  expiresAt: string;
  resetToken?: string;
  resetUrl?: string;
  message?: string;
}
