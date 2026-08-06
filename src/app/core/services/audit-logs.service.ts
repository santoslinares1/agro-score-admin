import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminAuditLog } from '../models/audit-log.model';
import { PaginatedResult } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  actorUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: AuditLogQuery): Observable<PaginatedResult<AdminAuditLog>> {
    return this.http.get<PaginatedResult<AdminAuditLog>>(`${this.apiUrl}/admin/audit-logs`, {
      params: toHttpParams(query),
    });
  }
}
