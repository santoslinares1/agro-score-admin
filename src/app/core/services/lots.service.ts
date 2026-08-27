import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminLot } from '../models/lot.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

// Admin PR 2: trazabilidad — "ver lotes de este campo/usuario" desde Campos/Usuarios
// (/lots?fieldId=<uuid>, /lots?userId=<uuid>).
export interface LotsQuery extends PaginationQuery {
  fieldId?: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class LotsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: LotsQuery): Observable<PaginatedResult<AdminLot>> {
    return this.http.get<PaginatedResult<AdminLot>>(`${this.apiUrl}/admin/lots`, {
      params: toHttpParams(query),
    });
  }
}
