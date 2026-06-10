import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { AuthState } from '../../../core/models';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';

interface NavItem { label: string; icon: string; route: string; badge?: string; }

@Component({ selector: 'app-sidebar', templateUrl: './sidebar.component.html' })
export class SidebarComponent implements OnInit {
  auth: AuthState | null = null;
  collapsed = false;
  mobileOpen = false;

  navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'grid',        route: '/dashboard' },
    { label: 'Invoices',        icon: 'file-text',   route: '/invoices' },
    { label: 'Payment Stands',  icon: 'qr-code',     route: '/payment-stands' },
    { label: 'Wallets',         icon: 'credit-card', route: '/wallets' },
    { label: 'Rates',           icon: 'trending-up', route: '/rates' },
    { label: 'Webhooks',        icon: 'zap',         route: '/webhooks' },
    { label: 'Reports',         icon: 'bar-chart-2', route: '/reports' },
    { label: 'Billing',         icon: 'dollar-sign', route: '/billing' },
  ];

  constructor(
    private authService: AuthService,
    private confirmModal: ConfirmModalService,
  ) {}

  ngOnInit(): void { this.authService.auth$.subscribe(a => this.auth = a); }

  toggle(): void { this.collapsed = !this.collapsed; }
  toggleMobile(): void { this.mobileOpen = !this.mobileOpen; }
  closeMobile(): void { this.mobileOpen = false; }

  async logout(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Sign out',
      message: 'You\'ll need to log in again to access your account.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      danger: true,
    });

    if (confirmed) {
      this.authService.logout();
    }
  }

  get initials(): string {
    const name = this.auth?.user?.name ?? this.auth?.businessName ?? '';
    return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get displayName(): string {
    return this.auth?.user?.name || this.auth?.businessName || 'Merchant';
  }

  get envBadge(): string { return this.auth?.environment ?? ''; }
}
