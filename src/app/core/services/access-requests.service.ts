import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import {
  AccessRequestStatus,
  AdminAccessRequest,
  CreateUserFromAccessRequestPayload,
  CreateUserFromAccessRequestResult,
  UpdateAccessRequestPayload,
} from '../models/access-request.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

export interface AccessRequestQuery extends PaginationQuery {
  status?: AccessRequestStatus;
}

@Injectable({ providedIn: 'root' })
export class AccessRequestsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: AccessRequestQuery): Observable<PaginatedResult<AdminAccessRequest>> {
    return this.http.get<PaginatedResult<AdminAccessRequest>>(
      `${this.apiUrl}/admin/access-requests`,
      { params: toHttpParams(query) },
    );
  }

  update(id: string, payload: UpdateAccessRequestPayload): Observable<AdminAccessRequest> {
    return this.http.patch<AdminAccessRequest>(
      `${this.apiUrl}/admin/access-requests/${id}`,
      payload,
    );
  }

  createUserFromRequest(
    id: string,
    payload: CreateUserFromAccessRequestPayload,
  ): Observable<CreateUserFromAccessRequestResult> {
    return this.http.post<CreateUserFromAccessRequestResult>(
      `${this.apiUrl}/admin/access-requests/${id}/create-user`,
      payload,
    );
  }
}
