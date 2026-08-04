import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { AdminUser, CreateAdminUserPayload, UpdateAdminUserPayload } from '../models/user.model';
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
}
