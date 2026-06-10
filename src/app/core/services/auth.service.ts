import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthState, LoginPayload, RegisterPayload } from '../models';

const BASE = environment.apiUrl + environment.smartInvoicingPath;
const AUTH_KEY = 'drx_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _auth$ = new BehaviorSubject<AuthState | null>(this.load());
  auth$ = this._auth$.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get auth(): AuthState | null { return this._auth$.value; }
  get token(): string { return this.auth?.token ?? ''; }
  get isLoggedIn(): boolean { return !!this.token; }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/auth/register`, payload).pipe(
      tap(res => { if (res.success) this.persist(res); })
    );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/auth/login`, payload).pipe(
      tap(res => { if (res.success) this.persist(res); })
    );
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this._auth$.next(null);
    this.router.navigate(['/auth/login']);
  }

  private persist(res: AuthResponse): void {
  const d = res.data;
  const state: AuthState = {
    token:        d.smartInvoicingToken ?? d.token,  // ← handle both field names
    apiKey:       d.apiKey ?? '',
    tenantId:     d.tenantId,
    businessId:   d.businessId ?? '',
    workspaceId:  d.workspaceId,
    environment:  d.environment,
    businessName: d.businessName ?? '',
    user: d.user ?? { name: '', email: '', role: 'OWNER' }
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  this._auth$.next(state);
}

  private load(): AuthState | null {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null'); }
    catch { return null; }
  }
}
