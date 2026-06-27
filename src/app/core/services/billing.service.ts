import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  BillingBill,
  BillingPlan,
  BillingSubscription,
  BillingUsage,
  PaginatedResponse,
} from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class BillingService {
  constructor(private http: HttpClient) {}

  // ── Plans ──────────────────────────────────────────────────────────────────
  getPlans(): Observable<ApiResponse<BillingPlan[]>> {
    return this.http.get<ApiResponse<BillingPlan[]>>(`${BASE}/billing/plans`);
  }

  // ── Subscription (kept for backward-compat; response now has billingMode) ─
  getSubscription(): Observable<ApiResponse<BillingSubscription>> {
    return this.http.get<ApiResponse<BillingSubscription>>(
      `${BASE}/billing/subscription`
    );
  }

  // Backward-compat only — backend still accepts this but PAYG ignores planCode
  changePlan(
    planCode: string,
    changeReason?: string
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${BASE}/billing/change-plan`, {
      planCode,
      changeReason,
    });
  }

  // ── Usage ──────────────────────────────────────────────────────────────────
  getUsage(params?: {
    billingMonth?: string;
    from?: string;
    to?: string;
  }): Observable<ApiResponse<BillingUsage>> {
    return this.http.get<ApiResponse<BillingUsage>>(
      `${BASE}/billing/usage`,
      { params: params as any }
    );
  }

  // ── Bills ──────────────────────────────────────────────────────────────────
  getBills(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    billingMonth?: string;
  }): Observable<PaginatedResponse<BillingBill>> {
    return this.http.get<PaginatedResponse<BillingBill>>(
      `${BASE}/billing/bills`,
      { params: params as any }
    );
  }

  getBillById(id: string): Observable<ApiResponse<BillingBill>> {
    return this.http.get<ApiResponse<BillingBill>>(
      `${BASE}/billing/bills/${id}`
    );
  }

  generateCurrentBill(payload?: {
    issue?: boolean;
    billingMonth?: string;
    billingDate?: string;
    from?: string;
    to?: string;
  }): Observable<ApiResponse<BillingBill>> {
    return this.http.post<ApiResponse<BillingBill>>(
      `${BASE}/billing/bills/generate-current`,
      payload ?? {}
    );
  }

  payBillCrypto(
    billId: string,
    asset: string,
    network: string
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE}/billing/bills/${billId}/pay-crypto`,
      { asset, network }
    );
  }

  // ── Billing Wallets ───────────────────────────────────────────────────────
  listBillingWallets(env?: 'TEST' | 'LIVE'): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${BASE}/billing/wallets`,
      env ? { params: { environment: env } } : {}
    );
  }

  createBillingWallet(payload: {
    environment: 'TEST' | 'LIVE';
    asset: string;
    network: string;
    address: string;
    label?: string;
    isDefault?: boolean;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE}/billing/wallets`,
      payload
    );
  }
}
