import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminLot } from '../models/lot.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

@Injectable({ providedIn: 'root' })
export class LotsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: PaginationQuery): Observable<PaginatedResult<AdminLot>> {
    return this.http.get<PaginatedResult<AdminLot>>(`${this.apiUrl}/admin/lots`, {
      params: toHttpParams(query),
    });
  }
}
