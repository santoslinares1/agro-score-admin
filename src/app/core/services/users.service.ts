import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { IssuedInvitationSummary } from '../models/access-request.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import {
  AdminUser,
  CreateAdminUserPayload,
  CreateInvitationPayload,
  PasswordResetResult,
  UpdateAdminUserPayload,
} from '../models/user.model';
import { toHttpParams } from './query-params.util';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: PaginationQuery): Observable<PaginatedResult<AdminUser>> {
    return this.http.get<PaginatedResult<AdminUser>>(`${this.apiUrl}/admin/users`, {
      params: toHttpParams(query),
    });
  }

  create(payload: CreateAdminUserPayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.apiUrl}/admin/users`, payload);
  }

  update(id: string, payload: UpdateAdminUserPayload): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiUrl}/admin/users/${id}`, payload);
  }

  deactivate(id: string): Observable<AdminUser> {
    return this.http.delete<AdminUser>(`${this.apiUrl}/admin/users/${id}`);
  }

  // ADMIN-2: alta de usuario vía invitación — mismo endpoint/forma de
  // respuesta que usa AccessRequestsComponent (IssuedInvitationSummary),
  // reutilizado acá en vez de duplicarlo.
  createInvitation(payload: CreateInvitationPayload): Observable<IssuedInvitationSummary> {
    return this.http.post<IssuedInvitationSummary>(`${this.apiUrl}/admin/invitations`, payload);
  }

  requestPasswordReset(userId: string): Observable<PasswordResetResult> {
    return this.http.post<PasswordResetResult>(
      `${this.apiUrl}/admin/users/${userId}/password-reset`,
      {},
    );
  }
}
