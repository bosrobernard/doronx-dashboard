import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CryptoService {
  constructor(private http: HttpClient) {}

  /**
   * GET /trade/pairs?baseAsset=USDT&quoteCurrency=GHS
   */
  getTradePairs(baseAsset?: string, quoteCurrency?: string): Observable<any> {
    let url = `${BASE}/trade/pairs`;
    const params: string[] = [];
    if (baseAsset) params.push(`baseAsset=${baseAsset.toUpperCase()}`);
    if (quoteCurrency) params.push(`quoteCurrency=${quoteCurrency.toUpperCase()}`);
    if (params.length) url += `?${params.join('&')}`;

    return this.http.get(url).pipe(
      catchError((error) => {
        console.error('getTradePairs error:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * POST /trade/convert
   * inputAsset: 'BASE' (crypto) | 'QUOTE' (fiat/local currency)
   */
  convertByInput(payload: {
    tradePairId: string;
    side: 'BUY' | 'SELL';
    amount: string | number;
    inputAsset: 'BASE' | 'QUOTE';
  }): Observable<any> {
    return this.http.post(`${BASE}/trade/convert`, payload).pipe(
      catchError((error) => {
        console.error('convertByInput error:', error);
        return throwError(() => error);
      }),
    );
  }
}
