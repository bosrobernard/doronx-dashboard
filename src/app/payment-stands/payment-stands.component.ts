import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentStandService } from '../core/services/payment-stand.service';
import { ToastService } from '../core/services/toast.service';
import { PaymentStand } from '../core/models';

@Component({
  selector: 'app-payment-stands',
  templateUrl: './payment-stands.component.html',
})
export class PaymentStandsComponent implements OnInit {
  stands: PaymentStand[] = [];
  loading = true;
  showForm = false;
  saving = false;
  disablingId: string | null = null;
  form: FormGroup;
  selectedStand: PaymentStand | null = null;

  assets = ['USDT', 'BTC', 'USDC'];
  networks = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];
  currencies = ['GHS', 'USD', 'NGN', 'CAD', 'EUR'];

  constructor(
    private standService: PaymentStandService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      standName: ['', Validators.required],
      standCode: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)],
      ],
      location: [''],
      tableNumber: [''],
      instructions: [''],
      mode: ['OPEN_AMOUNT', Validators.required],
      fixedAmount: [null],
      currency: ['GHS', Validators.required],
      allowedAssets: [['USDT'], Validators.required],
      allowedNetworks: [['TRC20'], Validators.required],
      defaultAsset: ['USDT', Validators.required],
      defaultNetwork: ['TRC20', Validators.required],
    });

    // Auto-generate standCode from standName
    this.form.get('standName')?.valueChanges.subscribe((v) => {
      const code = (v ?? '')
        .toUpperCase()
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '');
      this.form.get('standCode')?.setValue(code, { emitEvent: false });
    });

    // Whenever the default network changes, make sure it's part of allowedNetworks
    this.form.get('defaultNetwork')?.valueChanges.subscribe((network) => {
      const curr: string[] = this.form.get('allowedNetworks')?.value ?? [];
      if (network && !curr.includes(network)) {
        this.form.get('allowedNetworks')?.setValue([...curr, network]);
      }
    });

    // Whenever the default asset changes, make sure it's part of allowedAssets
    this.form.get('defaultAsset')?.valueChanges.subscribe((asset) => {
      const curr: string[] = this.form.get('allowedAssets')?.value ?? [];
      if (asset && !curr.includes(asset)) {
        this.form.get('allowedAssets')?.setValue([...curr, asset]);
      }
    });

    // Toggle fixedAmount validator based on mode
    this.form.get('mode')?.valueChanges.subscribe((mode) => {
      const fixedAmountCtrl = this.form.get('fixedAmount');
      if (mode === 'FIXED_AMOUNT') {
        fixedAmountCtrl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        fixedAmountCtrl?.clearValidators();
        fixedAmountCtrl?.setValue(null);
      }
      fixedAmountCtrl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.standService.list().subscribe({
      next: (res) => {
        this.stands = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  toggleAsset(asset: string): void {
    const curr: string[] = this.form.get('allowedAssets')?.value ?? [];
    const next = curr.includes(asset)
      ? curr.filter((a) => a !== asset)
      : [...curr, asset];

    // Don't allow removing the currently-selected default asset
    if (asset === this.form.get('defaultAsset')?.value && curr.includes(asset)) {
      return;
    }
    this.form.get('allowedAssets')?.setValue(next);
  }

  isAssetSelected(asset: string): boolean {
    return (this.form.get('allowedAssets')?.value ?? []).includes(asset);
  }

  toggleNetwork(network: string): void {
    const curr: string[] = this.form.get('allowedNetworks')?.value ?? [];
    const next = curr.includes(network)
      ? curr.filter((n) => n !== network)
      : [...curr, network];

    // Don't allow removing the currently-selected default network
    if (network === this.form.get('defaultNetwork')?.value && curr.includes(network)) {
      return;
    }
    this.form.get('allowedNetworks')?.setValue(next);
  }

  isNetworkSelected(network: string): boolean {
    return (this.form.get('allowedNetworks')?.value ?? []).includes(network);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    const formValue = this.form.value;
    const payload: any = { ...formValue };

    // Don't send fixedAmount at all when mode is OPEN_AMOUNT
    if (payload.mode !== 'FIXED_AMOUNT') {
      delete payload.fixedAmount;
    }

    this.standService.create(payload).subscribe({
      next: (res) => {
        this.toast.success(
          `Payment stand "${res.data?.standName ?? 'Stand'}" created!`,
        );
        this.showForm = false;
        this.form.reset({
          mode: 'OPEN_AMOUNT',
          currency: 'GHS',
          defaultAsset: 'USDT',
          defaultNetwork: 'TRC20',
          allowedAssets: ['USDT'],
          allowedNetworks: ['TRC20'],
          fixedAmount: null,
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

  disable(stand: PaymentStand): void {
    const id = stand.standId ?? stand._id ?? '';
    this.disablingId = id;
    this.standService.disable(id).subscribe({
      next: () => {
        this.toast.success('Stand disabled');
        this.load();
        this.disablingId = null;
      },
      error: () => {
        this.disablingId = null;
      },
    });
  }

  viewStand(stand: PaymentStand): void {
    const id = stand.standId ?? stand._id;
    const selectedId = this.selectedStand?.standId ?? this.selectedStand?._id;
    this.selectedStand = selectedId === id ? null : stand;
  }

  copyUrl(url: string): void {
    navigator.clipboard.writeText(url);
    this.toast.success('Copied!');
  }
  openPrint(url: string): void {
    window.open(url, '_blank');
  }

  f(n: string) {
    return this.form.get(n)!;
  }
}
