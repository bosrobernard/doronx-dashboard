import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WalletService } from '../core/services/wallet.service';
import { ToastService } from '../core/services/toast.service';
import { WalletProfile } from '../core/models';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'app-wallets', templateUrl: './wallets.component.html' })
export class WalletsComponent implements OnInit {
  wallets: WalletProfile[] = [];
  loading = true;
  showForm = false;
  saving = false;
  settingDefaultId: string | null = null;
  form: FormGroup;

  assets = ['USDT', 'BTC', 'USDC'];
  networks: Record<string, string[]> = {
    USDT: ['TRC20', 'BEP20', 'SOLANA', 'POLYGON'],
    BTC: ['BTC'],
    USDC: ['POLYGON', 'SOLANA'],
  };

  constructor(
    private walletService: WalletService,
    private fb: FormBuilder,
    private toast: ToastService,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      asset: ['USDT', Validators.required],
      network: ['TRC20', Validators.required],
      address: ['', Validators.required],
      label: ['Main Wallet', Validators.required],
      isDefault: [false],
      ownershipProofType: ['MANUAL'],
    });

    this.form.get('asset')?.valueChanges.subscribe((a) => {
      const nets = this.networks[a] ?? [];
      this.form.get('network')?.setValue(nets[0] ?? '');
    });
  }

  ngOnInit(): void {
    // Auto-open form if navigated from setup
    this.route.queryParams.subscribe((params) => {
      if (params['add'] === 'true') {
        this.showForm = true;
      }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.walletService.list().subscribe({
      next: (res) => {
        this.wallets = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get availableNetworks(): string[] {
    return this.networks[this.form.get('asset')?.value] ?? [];
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.walletService.create(this.form.value).subscribe({
      next: () => {
        this.toast.success('Wallet profile added!');
        this.showForm = false;
        this.form.reset({
          asset: 'USDT',
          network: 'TRC20',
          label: 'Main Wallet',
          isDefault: false,
          ownershipProofType: 'MANUAL',
        });
        this.load();
      },
      error: () => {
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  setDefault(wallet: WalletProfile): void {
    const id = wallet.walletProfileId ?? wallet._id ?? '';
    if (!id || wallet.isDefault) return;
    this.settingDefaultId = id;
    this.walletService.setDefault(id).subscribe({
      next: () => {
        this.toast.success('Default wallet updated');
        this.load();
        this.settingDefaultId = null;
      },
      error: () => {
        this.settingDefaultId = null;
      },
    });
  }

  getId(w: WalletProfile): string {
    return w.walletProfileId ?? w._id ?? '';
  }

  f(n: string) {
    return this.form.get(n)!;
  }
}
