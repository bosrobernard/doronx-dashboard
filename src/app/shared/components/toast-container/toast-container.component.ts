import { Component } from '@angular/core';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-container">
      <div class="toast" *ngFor="let t of (toastService.toasts$ | async)"
           [class]="'toast-' + t.type">
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" (click)="toastService.remove(t.id)">×</button>
      </div>
    </div>
  `
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
