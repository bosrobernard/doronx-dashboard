import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, ReportSummary } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private http: HttpClient) {}

  getSummary(from?: string, to?: string): Observable<ApiResponse<ReportSummary>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<ApiResponse<ReportSummary>>(`${BASE}/reports/summary`, { params });
  }
}


