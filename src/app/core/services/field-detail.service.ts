import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AdminFieldDetail } from '../models/field-detail.model';

@Injectable({ providedIn: 'root' })
export class FieldDetailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  get(fieldId: string): Observable<AdminFieldDetail> {
    return this.http.get<AdminFieldDetail>(`${this.apiUrl}/admin/fields/${fieldId}`);
  }
}
