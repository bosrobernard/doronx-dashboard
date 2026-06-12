import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, CreateTradePairPayload, PaginatedResponse, RateQuote, TradePair } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;

@Injectable({ providedIn: 'root' })
export class RateService {
  constructor(private http: HttpClient) {}

  listTradePairs(): Observable<PaginatedResponse<TradePair>> {
    return this.http.get<PaginatedResponse<TradePair>>(`${BASE}/rates/trade-pairs`);
  }

  createTradePair(payload: CreateTradePairPayload): Observable<ApiResponse<TradePair>> {
    return this.http.post<ApiResponse<TradePair>>(`${BASE}/rates/trade-pairs`, payload);
  }

 refreshRate(baseAsset: string, quoteCurrency: string): Observable<ApiResponse<any>> {
  return this.http.post<ApiResponse<any>>(`${BASE}/rates/refresh`, { baseAsset, quoteCurrency });
}

  getQuote(amount: number, invoiceCurrency: string, paymentAsset: string, forceRefresh = true): Observable<ApiResponse<RateQuote>> {
    return this.http.post<ApiResponse<RateQuote>>(`${BASE}/rates/quote`, {
      amount, invoiceCurrency, paymentAsset, forceRefresh
    });
  }
}


