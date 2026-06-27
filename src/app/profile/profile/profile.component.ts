import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ApiKeyService, ApiKey } from '../../core/services/api-key.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmModalService } from '../../core/services/confirm-modal.service';
import { AuthState, WorkspaceSetup } from '../../core/models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  auth: AuthState | null = null;
  setup: WorkspaceSetup | null = null;
  setupLoading = true;
  activeTab: 'overview' | 'workspace' | 'api-keys' = 'overview';

  // ── API Keys state ───────────────────────────────────────────────────────
  apiKeys: ApiKey[] = [];
  apiKeysLoading = false;
  apiKeysLoaded = false;
  showCreateForm = false;
  creatingKey = false;
  createForm: FormGroup;
  /** Holds the full key string right after creation (shown once then cleared) */
  newKeySecret: string | null = null;
  newKeySecretCopied = false;

  constructor(
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    private apiKeyService: ApiKeyService,
    private toast: ToastService,
    private confirmModal: ConfirmModalService,
    private fb: FormBuilder,
  ) {
    this.createForm = this.fb.group({
      name: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.authService.auth$.subscribe((a) => (this.auth = a));

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

  // ── Tab switching ─────────────────────────────────────────────────────────
  switchTab(tab: 'overview' | 'workspace' | 'api-keys'): void {
    this.activeTab = tab;
    if (tab === 'api-keys' && !this.apiKeysLoaded) {
      this.loadApiKeys();
    }
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  loadApiKeys(): void {
    this.apiKeysLoading = true;
    this.apiKeyService.listApiKeys({ limit: 50 }).subscribe({
      next: (res) => {
        this.apiKeys = (res as any)?.data ?? [];
        this.apiKeysLoading = false;
        this.apiKeysLoaded = true;
      },
      error: () => {
        this.apiKeysLoading = false;
      },
    });
  }

  openCreateForm(): void {
    this.showCreateForm = true;
    this.newKeySecret = null;
    this.createForm.reset();
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.newKeySecret = null;
    this.createForm.reset();
  }

  createApiKey(): void {
    if (this.createForm.invalid) return;
    this.creatingKey = true;
    this.apiKeyService.createApiKey({ name: this.createForm.value.name }).subscribe({
      next: (res) => {
        const created: ApiKey = (res as any)?.data ?? res;
        this.newKeySecret = created.key ?? null;
        this.showCreateForm = false;
        this.createForm.reset();
        this.creatingKey = false;
        this.loadApiKeys();
      },
      error: () => {
        this.creatingKey = false;
      },
    });
  }

  async disableApiKey(key: ApiKey): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Disable API key',
      message: `Disable "${key.name}"? Any integrations using this key will stop working immediately.`,
      confirmLabel: 'Disable key',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    this.apiKeyService.disableApiKey(key.apiKeyId).subscribe({
      next: () => {
        this.toast.success('API key disabled');
        this.loadApiKeys();
      },
    });
  }

  async deleteApiKey(key: ApiKey): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Delete API key',
      message: `Permanently delete "${key.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    this.apiKeyService.deleteApiKey(key.apiKeyId).subscribe({
      next: () => {
        this.toast.success('API key deleted');
        this.loadApiKeys();
      },
    });
  }

  copySecret(): void {
    if (this.newKeySecret) {
      navigator.clipboard.writeText(this.newKeySecret).then(() => {
        this.newKeySecretCopied = true;
        setTimeout(() => (this.newKeySecretCopied = false), 2000);
      });
    }
  }

  dismissSecret(): void {
    this.newKeySecret = null;
    this.newKeySecretCopied = false;
  }

  // ── Profile getters (unchanged) ───────────────────────────────────────────
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
