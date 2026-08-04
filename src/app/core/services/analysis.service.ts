import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminAnalysis, AnalysisStatus } from '../models/analysis.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

export interface AnalysisQuery extends PaginationQuery {
  status?: AnalysisStatus;
}

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: AnalysisQuery): Observable<PaginatedResult<AdminAnalysis>> {
    return this.http.get<PaginatedResult<AdminAnalysis>>(`${this.apiUrl}/admin/analysis`, {
      params: toHttpParams(query),
    });
  }
}
