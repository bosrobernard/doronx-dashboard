import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CreateWebhookPayload, PaginatedResponse, WebhookDelivery, WebhookEndpoint } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class WebhookManagementService {
  constructor(private http: HttpClient) {}

  list(): Observable<PaginatedResponse<WebhookEndpoint>> {
    return this.http.get<PaginatedResponse<WebhookEndpoint>>(`${BASE}/webhooks`);
  }

  create(payload: CreateWebhookPayload): Observable<ApiResponse<WebhookEndpoint>> {
    return this.http.post<ApiResponse<WebhookEndpoint>>(`${BASE}/webhooks`, payload);
  }

  update(id: string, payload: Partial<CreateWebhookPayload>): Observable<ApiResponse<WebhookEndpoint>> {
    return this.http.patch<ApiResponse<WebhookEndpoint>>(`${BASE}/webhooks/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${BASE}/webhooks/${id}`);
  }

  getDeliveries(status?: string, page = 1, limit = 20): Observable<PaginatedResponse<WebhookDelivery>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<WebhookDelivery>>(`${BASE}/webhooks/deliveries`, { params });
  }
}


