import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CreateWalletPayload, PaginatedResponse, WalletProfile } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class WalletService {
  constructor(private http: HttpClient) {}

  list(): Observable<PaginatedResponse<WalletProfile>> {
    return this.http.get<PaginatedResponse<WalletProfile>>(`${BASE}/wallet-profiles`);
  }

  create(payload: CreateWalletPayload): Observable<ApiResponse<WalletProfile>> {
    return this.http.post<ApiResponse<WalletProfile>>(`${BASE}/wallet-profiles`, payload);
  }

  update(id: string, payload: Partial<CreateWalletPayload>): Observable<ApiResponse<WalletProfile>> {
    return this.http.patch<ApiResponse<WalletProfile>>(`${BASE}/wallet-profiles/${id}`, payload);
  }

  setDefault(id: string): Observable<ApiResponse<WalletProfile>> {
    return this.update(id, { isDefault: true });
  }
}
