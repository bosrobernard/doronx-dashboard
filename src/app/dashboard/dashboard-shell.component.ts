import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-shell',
  template: `
    <div class="shell">
      <app-sidebar #sidebar></app-sidebar>
      <div class="shell-main" [class.sidebar-collapsed]="sidebar.collapsed">
        <app-topbar [pageTitle]="pageTitle" (menuToggle)="sidebar.toggleMobile()"></app-topbar>
        <main class="shell-content">
          <router-outlet></router-outlet>
        </main>
      </div>
      <app-toast-container></app-toast-container>
    </div>
  `
})
export class DashboardShellComponent implements OnInit {
  pageTitle = 'Dashboard';

  private titleMap: Record<string, string> = {
    '/dashboard':      'Dashboard',
    '/onboarding':     'Workspace Setup',
    '/invoices':       'Invoices',
    '/invoices/create':'Create Invoice',
    '/payment-stands': 'Payment Stands',
    '/wallets':        'Wallet Profiles',
    '/rates':          'Rate Engine',
    '/webhooks':       'Webhooks',
    '/reports':        'Reports',
    '/billing':        'Billing & Plans',
    '/profile':        'Profile',
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateTitle(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => this.updateTitle(e.urlAfterRedirects ?? e.url));
  }

  private updateTitle(url: string): void {
    const base = '/' + url.split('/').filter(Boolean)[0];
    const full = url.split('?')[0];
    this.pageTitle = this.titleMap[full] ?? this.titleMap[base] ?? 'DoronX';
  }
}


