import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminScheduledAnalysisItem } from '../models/scheduled-analysis.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

// Admin PR 2: trazabilidad — "ver programados de este campo/usuario" desde Campos/Usuarios
// (/scheduled-analysis?fieldId=<uuid>, ?userId=<uuid>) y "solo activos" (?enabled=true).
// hasRuns=false queda fuera de este PR (ver docs/admin-ux-notes.md).
export interface ScheduledAnalysisQuery extends PaginationQuery {
  fieldId?: string;
  userId?: string;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScheduledAnalysisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(
    query: ScheduledAnalysisQuery,
  ): Observable<PaginatedResult<AdminScheduledAnalysisItem>> {
    return this.http.get<PaginatedResult<AdminScheduledAnalysisItem>>(
      `${this.apiUrl}/admin/scheduled-analysis`,
      { params: toHttpParams(query) },
    );
  }
}
