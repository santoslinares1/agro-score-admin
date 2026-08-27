import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import {
  AdminScheduledAnalysisItem,
  AdminScheduledAnalysisSummary,
} from '../models/scheduled-analysis.model';
import { PaginatedResult, PaginationQuery } from '../models/pagination.model';
import { toHttpParams } from './query-params.util';

// Admin PR 2: trazabilidad — "ver programados de este campo/usuario" desde Campos/Usuarios
// (/scheduled-analysis?fieldId=<uuid>, ?userId=<uuid>) y "solo activos" (?enabled=true).
// Admin PR 3: hasRuns usa existencia real de corridas (EXISTS/NOT EXISTS), no lastRunAt — ver
// AdminService.listScheduledAnalysis en agro-score-api. mailStatus queda fuera (ver
// docs/admin-ux-notes.md): la info de mail por fila y en el resumen ya cubre la necesidad
// operativa sin tocar el join principal.
export interface ScheduledAnalysisQuery extends PaginationQuery {
  fieldId?: string;
  userId?: string;
  enabled?: boolean;
  hasRuns?: boolean;
}

export type ScheduledAnalysisListResult = PaginatedResult<AdminScheduledAnalysisItem> & {
  summary: AdminScheduledAnalysisSummary;
};

@Injectable({ providedIn: 'root' })
export class ScheduledAnalysisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(query: ScheduledAnalysisQuery): Observable<ScheduledAnalysisListResult> {
    return this.http.get<ScheduledAnalysisListResult>(`${this.apiUrl}/admin/scheduled-analysis`, {
      params: toHttpParams(query),
    });
  }
}
