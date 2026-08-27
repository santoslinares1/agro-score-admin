import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminProductAnalytics } from '../models/product-analytics.model';

@Injectable({ providedIn: 'root' })
export class ProductAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getProductAnalytics(): Observable<AdminProductAnalytics> {
    return this.http.get<AdminProductAnalytics>(`${this.apiUrl}/admin/product-analytics`);
  }
}
