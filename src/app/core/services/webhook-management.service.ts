import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  CreatedWebhookEndpoint,
  CreateWebhookPayload,
  PaginatedResponse,
  WebhookDelivery,
  WebhookEndpoint,
} from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

export interface ListResponse<T> {
  success: boolean;
  message?: string;
  data: {
    items: T[];
    meta: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasMore: boolean;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class WebhookManagementService {
  constructor(private http: HttpClient) {}

  list(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    eventType?: string;
  }): Observable<ListResponse<WebhookEndpoint>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.isActive !== undefined)
      httpParams = httpParams.set('isActive', params.isActive);
    if (params?.eventType)
      httpParams = httpParams.set('eventType', params.eventType);
    return this.http.get<ListResponse<WebhookEndpoint>>(`${BASE}/webhooks`, {
      params: httpParams,
    });
  }

  create(
    payload: CreateWebhookPayload,
  ): Observable<ApiResponse<CreatedWebhookEndpoint>> {
    return this.http.post<ApiResponse<CreatedWebhookEndpoint>>(
      `${BASE}/webhooks`,
      payload,
    );
  }

  update(
    id: string,
    payload: Partial<CreateWebhookPayload>,
  ): Observable<ApiResponse<WebhookEndpoint>> {
    return this.http.patch<ApiResponse<WebhookEndpoint>>(
      `${BASE}/webhooks/${id}`,
      payload,
    );
  }

  delete(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${BASE}/webhooks/${id}`);
  }

  disable(id: string): Observable<ApiResponse<WebhookEndpoint>> {
    return this.http.patch<ApiResponse<WebhookEndpoint>>(
      `${BASE}/webhooks/${id}/disable`,
      {},
    );
  }

  getDeliveries(
    status?: string,
    page = 1,
    limit = 20,
  ): Observable<ListResponse<WebhookDelivery>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<ListResponse<WebhookDelivery>>(
      `${BASE}/webhooks/deliveries`,
      { params },
    );
  }
}
