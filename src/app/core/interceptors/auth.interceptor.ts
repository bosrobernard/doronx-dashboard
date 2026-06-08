import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private toast: ToastService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.token;
    const modified = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(modified).pipe(
      catchError((err: HttpErrorResponse) => {
        const msg = err.error?.message ?? err.message ?? 'An error occurred';
        if (err.status === 401) {
          this.toast.error('Session expired. Please log in again.');
          this.auth.logout();
        } else {
          this.toast.error(msg);
        }
        return throwError(() => err);
      })
    );
  }
}
