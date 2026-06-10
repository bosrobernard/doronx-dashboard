import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CreateInvoicePayload, Invoice, InvoiceResponse, InvoiceSearchParams, PaginatedResponse } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private http: HttpClient) {}

  list(): Observable<PaginatedResponse<Invoice>> {
    return this.http.get<PaginatedResponse<Invoice>>(`${BASE}/invoices`);
  }

  search(params: InvoiceSearchParams): Observable<PaginatedResponse<Invoice>> {
    let p = new HttpParams();
    if (params.q)      p = p.set('q', params.q);
    if (params.status) p = p.set('status', params.status);
    if (params.page)   p = p.set('page', params.page);
    if (params.limit)  p = p.set('limit', params.limit);
    if (params.from)   p = p.set('from', params.from);
    if (params.to)     p = p.set('to', params.to);
    return this.http.get<PaginatedResponse<Invoice>>(`${BASE}/invoices/search`, { params: p });
  }

  create(payload: CreateInvoicePayload): Observable<ApiResponse<InvoiceResponse>> {
    return this.http.post<ApiResponse<InvoiceResponse>>(`${BASE}/invoices`, payload);
  }

  getById(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${BASE}/invoices/${id}`);
  }

  getByReference(referenceCode: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${BASE}/invoices/reference/${referenceCode}`);
  }

  registerDetection(paymentIntentId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE}/detection/payment-intents/${paymentIntentId}/register`, {}
    );
  }
}

