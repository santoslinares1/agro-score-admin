import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminProductAnalytics } from '../models/product-analytics.model';

@Injectable({ providedIn: 'root' })
export class ProductAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * `week`: cualquier fecha (YYYY-MM-DD) dentro de la semana calendario a reportar — la API la
   * resuelve al lunes-domingo que la contiene. Sin `week`, la API devuelve la última semana
   * calendario ya completa (nunca la semana en curso, todavía parcial).
   */
  getProductAnalytics(week?: string): Observable<AdminProductAnalytics> {
    const params = week ? new HttpParams().set('week', week) : undefined;
    return this.http.get<AdminProductAnalytics>(`${this.apiUrl}/admin/product-analytics`, { params });
  }
}
