
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthState, WorkspaceSetup } from '../../core/models';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  auth: AuthState | null = null;
  setup: WorkspaceSetup | null = null;
  setupLoading = true;
  activeTab: 'overview' | 'workspace' = 'overview';

  constructor(
    private authService: AuthService,
    private workspaceService: WorkspaceService,
  ) {}

  ngOnInit(): void {
    this.authService.auth$.subscribe(a => (this.auth = a));

    this.workspaceService.getSetup().subscribe({
      next: (res) => {
        this.setup = res.data;
        this.setupLoading = false;
      },
      error: () => {
        this.setupLoading = false;
      },
    });
  }

  get initials(): string {
    const name = this.auth?.user?.name ?? this.auth?.businessName ?? '';
    return name
      .split(' ')
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get displayName(): string {
    return this.auth?.user?.name || this.auth?.businessName || 'Merchant';
  }

  get email(): string {
    return this.auth?.user?.email || '—';
  }

  get role(): string {
    return this.auth?.user?.role || 'OWNER';
  }

  get environment(): string {
    return this.auth?.environment || '—';
  }

  get userId(): string {
    return this.auth?.user?.userId || '—';
  }

  get tenantId(): string {
    return (this.auth as any)?.tenantId || '—';
  }

  get businessId(): string {
    return (this.auth as any)?.businessId || '—';
  }

  get workspaceId(): string {
    return (this.auth as any)?.workspaceId || '—';
  }

  get setupProgress(): number {
    return this.setup?.progress ?? 0;
  }

  get completedSteps(): number {
    return this.setup?.completedSteps ?? 0;
  }

  get totalSteps(): number {
    return this.setup?.totalSteps ?? 0;
  }

  get workspaceStatus(): string {
    return this.setup?.status ?? '—';
  }

  get canGoLive(): boolean {
    return this.setup?.canGoLive ?? false;
  }

  get workspaceSteps() {
    return this.setup?.steps ?? [];
  }

  stepStatusType(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'success',
      PENDING: 'warning',
      REQUIRED: 'error',
    };
    return map[status] ?? 'neutral';
  }

  copied: string | null = null;

  copyToClipboard(value: string, key: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.copied = key;
      setTimeout(() => (this.copied = null), 1800);
    });
  }
}


