import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, BillingBill, BillingPlan, BillingSubscription, BillingUsage, PaginatedResponse } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class BillingService {
  constructor(private http: HttpClient) {}

  getPlans(): Observable<ApiResponse<BillingPlan[]>> {
    return this.http.get<ApiResponse<BillingPlan[]>>(`${BASE}/billing/plans`);
  }

  getSubscription(): Observable<ApiResponse<BillingSubscription>> {
    return this.http.get<ApiResponse<BillingSubscription>>(`${BASE}/billing/subscription`);
  }

  changePlan(planCode: string, changeReason?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${BASE}/billing/change-plan`, { planCode, changeReason });
  }

  getUsage(): Observable<ApiResponse<BillingUsage>> {
    return this.http.get<ApiResponse<BillingUsage>>(`${BASE}/billing/usage`);
  }

  getBills(): Observable<PaginatedResponse<BillingBill>> {
    return this.http.get<PaginatedResponse<BillingBill>>(`${BASE}/billing/bills`);
  }

  getBillById(id: string): Observable<ApiResponse<BillingBill>> {
    return this.http.get<ApiResponse<BillingBill>>(`${BASE}/billing/bills/${id}`);
  }

  generateCurrentBill(): Observable<ApiResponse<BillingBill>> {
    return this.http.post<ApiResponse<BillingBill>>(`${BASE}/billing/bills/generate-current`, {});
  }

  payBillCrypto(billId: string, asset: string, network: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${BASE}/billing/bills/${billId}/pay-crypto`, { asset, network });
  }
}
