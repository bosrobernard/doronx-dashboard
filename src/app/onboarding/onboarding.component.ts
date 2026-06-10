import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceService } from '../core/services/workspace.service';
import { WorkspaceSetup, SetupStep } from '../core/models';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent implements OnInit {
  setup: WorkspaceSetup | null = null;
  loading = true;

  constructor(
    private workspaceService: WorkspaceService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.workspaceService.getSetup().subscribe({
      next: (res) => {
        this.setup = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // Use the route from the API action, fall back to known local routes
  navigate(step: SetupStep): void {
    const apiRoute = step.action?.route ?? '';
    const localRoute =
      apiRoute.replace('/smart-invoicing', '') || this.fallback(step.key);

    // Wallet steps should land with form open
    const walletKeys = ['wallet_profile', 'default_wallet', 'wallet_ownership'];
    if (walletKeys.includes(step.key)) {
      this.router.navigate(['/wallets'], { queryParams: { add: 'true' } });
    } else {
      this.router.navigate([localRoute]);
    }
  }

  private fallback(key: string): string {
    const map: Record<string, string> = {
      wallet_profile: '/wallets',
      default_wallet: '/wallets',
      wallet_ownership: '/wallets',
      trade_pairs: '/rates',
      billing_plan: '/billing',
      api_key: '/billing',
      webhook: '/webhooks',
      branding: '/dashboard',
    };
    return map[key] ?? '/dashboard';
  }

  get progressColor(): string {
    const p = this.setup?.progress ?? 0;
    if (p >= 100) return 'var(--green)';
    if (p >= 60) return 'var(--orange)';
    return 'var(--red)';
  }
}
