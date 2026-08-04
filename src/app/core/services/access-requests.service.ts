import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminAccessRequest, AccessRequestStatus } from '../models/access-request.model';
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
}
