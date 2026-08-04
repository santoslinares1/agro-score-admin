import { AdminUser } from './user.model';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AdminUser;
  accessToken: string;
}
