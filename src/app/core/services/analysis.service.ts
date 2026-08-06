import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminAnalysis, AnalysisStatus } from '../models/analysis.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

export interface AnalysisQuery extends PaginationQuery {
  status?: AnalysisStatus;
  fieldId?: string;
  userId?: string;
  from?: string;
  to?: string;
  onlyFailed?: boolean;
  onlyUnreviewed?: boolean;
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

  // ADMIN-2: la respuesta de estos dos endpoints es la entidad Analysis
  // completa (no el DTO liviano que arma `list()` — sin fieldName/ownerEmail
  // resueltos). No se tipa ese shape acá a propósito: después de cada
  // acción se refresca la tabla con `list()`, así que el body de estas dos
  // respuestas no se usa para pintar nada.
  markReviewed(id: string): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/admin/analysis/${id}/mark-reviewed`, {});
  }

  retry(id: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/admin/analysis/${id}/retry`, {});
  }
}
