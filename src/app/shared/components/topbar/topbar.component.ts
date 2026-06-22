import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  @Input() pageTitle = '';
  @Output() menuToggle = new EventEmitter<void>();

  constructor(public authService: AuthService) {}

  get businessName(): string {
    return this.authService.auth?.user?.name ?? '';
  }

  get environment(): string {
    return this.authService.auth?.environment ?? 'LIVE';
  }
}
