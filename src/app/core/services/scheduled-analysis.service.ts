import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminScheduledAnalysisItem } from '../models/scheduled-analysis.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

@Injectable({ providedIn: 'root' })
export class ScheduledAnalysisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: PaginationQuery): Observable<PaginatedResult<AdminScheduledAnalysisItem>> {
    return this.http.get<PaginatedResult<AdminScheduledAnalysisItem>>(
      `${this.apiUrl}/admin/scheduled-analysis`,
      { params: toHttpParams(query) },
    );
  }
}
