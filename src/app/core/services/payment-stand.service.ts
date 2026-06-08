import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CreatePaymentStandPayload, PaginatedResponse, PaymentStand } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class PaymentStandService {
  constructor(private http: HttpClient) {}

  list(): Observable<PaginatedResponse<PaymentStand>> {
    return this.http.get<PaginatedResponse<PaymentStand>>(`${BASE}/payment-stands`);
  }

  create(payload: CreatePaymentStandPayload): Observable<ApiResponse<PaymentStand>> {
    return this.http.post<ApiResponse<PaymentStand>>(`${BASE}/payment-stands`, payload);
  }

  getById(id: string): Observable<ApiResponse<PaymentStand>> {
    return this.http.get<ApiResponse<PaymentStand>>(`${BASE}/payment-stands/${id}`);
  }

  update(id: string, payload: Partial<CreatePaymentStandPayload>): Observable<ApiResponse<PaymentStand>> {
    return this.http.patch<ApiResponse<PaymentStand>>(`${BASE}/payment-stands/${id}`, payload);
  }

  disable(id: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${BASE}/payment-stands/${id}/disable`, {});
  }
}
