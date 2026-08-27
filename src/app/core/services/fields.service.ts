import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminField } from '../models/field.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

export interface FieldsQuery extends PaginationQuery {
  // Admin PR 1: hasAnalysis=false soporta la alerta "Campos sin diagnóstico" del Dashboard —
  // mismo filtro real que agrega AdminService.listFields en agro-score-api.
  hasAnalysis?: boolean;
  // Admin PR 2: trazabilidad — "ver campos de este usuario" (Usuarios/Diagnósticos/Programados)
  // y "saltar a este campo puntual" (Diagnósticos/Programados, sin vista de detalle dedicada).
  userId?: string;
  fieldId?: string;
}

@Injectable({ providedIn: 'root' })
export class FieldsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: FieldsQuery): Observable<PaginatedResult<AdminField>> {
    return this.http.get<PaginatedResult<AdminField>>(`${this.apiUrl}/admin/fields`, {
      params: toHttpParams(query),
    });
  }
}
