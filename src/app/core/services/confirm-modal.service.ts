import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  private requestSubject = new Subject<ConfirmRequest | null>();
  request$ = this.requestSubject.asObservable();

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.requestSubject.next({ ...options, resolve });
    });
  }

  dismiss(): void {
    this.requestSubject.next(null);
  }
}
