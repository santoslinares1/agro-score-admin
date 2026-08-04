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
