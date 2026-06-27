import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

export interface ApiKey {
  _id: string;
  name: string;
  key: string; // only returned on create
  keyPreview?: string; // e.g. "sk_••••••••abcd"
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes?: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  constructor(private http: HttpClient) {}

  listApiKeys(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Observable<PaginatedResponse<ApiKey>> {
    return this.http.get<PaginatedResponse<ApiKey>>(
      `${BASE}/api-keys`,
      { params: params as any }
    );
  }

  createApiKey(payload: CreateApiKeyPayload): Observable<ApiResponse<ApiKey>> {
    return this.http.post<ApiResponse<ApiKey>>(`${BASE}/api-keys`, payload);
  }

  disableApiKey(apiKeyId: string): Observable<ApiResponse<ApiKey>> {
    return this.http.patch<ApiResponse<ApiKey>>(
      `${BASE}/api-keys/${apiKeyId}/disable`,
      {}
    );
  }

  deleteApiKey(apiKeyId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${BASE}/api-keys/${apiKeyId}`
    );
  }
}
