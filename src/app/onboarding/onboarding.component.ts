import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceService } from '../core/services/workspace.service';
import { WorkspaceSetup, SetupStep } from '../core/models';

@Component({ selector: 'app-onboarding', templateUrl: './onboarding.component.html' })
export class OnboardingComponent implements OnInit {
  setup: WorkspaceSetup | null = null;
  loading = true;

  routeMap: Record<string, string> = {
    wallet:          '/wallets',
    default_wallet:  '/wallets',
    trade_pair:      '/rates',
    webhook:         '/webhooks',
    plan:            '/billing',
  };

  constructor(private workspaceService: WorkspaceService, private router: Router) {}

  ngOnInit(): void {
    this.workspaceService.getSetup().subscribe({
      next: res => { this.setup = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  navigate(step: SetupStep): void {
    const route = step.action?.route ?? this.routeMap[step.key] ?? '/dashboard';
    this.router.navigate([route]);
  }

  get progressColor(): string {
    const p = this.setup?.progress ?? 0;
    if (p >= 100) return 'var(--green)';
    if (p >= 60)  return 'var(--orange)';
    return 'var(--red)';
  }

  get steps(): { key: string; label: string; done: boolean; route: string }[] {
    return [
      { key: 'wallet',         label: 'Connect a wallet',       done: !this.setup?.missingRequired.find(m => m.key === 'wallet'),         route: '/wallets' },
      { key: 'default_wallet', label: 'Set default wallet',     done: !this.setup?.missingRequired.find(m => m.key === 'default_wallet'),  route: '/wallets' },
      { key: 'trade_pair',     label: 'Enable a trade pair',    done: !this.setup?.missingRequired.find(m => m.key === 'trade_pair'),      route: '/rates' },
      { key: 'webhook',        label: 'Configure a webhook',    done: !this.setup?.missingRequired.find(m => m.key === 'webhook'),         route: '/webhooks' },
      { key: 'plan',           label: 'Choose a plan for LIVE', done: !this.setup?.missingRequired.find(m => m.key === 'plan'),           route: '/billing' },
    ];
  }
}
