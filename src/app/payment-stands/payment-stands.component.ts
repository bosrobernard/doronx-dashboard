import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentStandService } from '../core/services/payment-stand.service';
import { ToastService } from '../core/services/toast.service';
import { PaymentStand } from '../core/models';

@Component({ selector: 'app-payment-stands', templateUrl: './payment-stands.component.html' })
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
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      standName:      ['', Validators.required],
      standCode:      ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      location:       [''],
      tableNumber:    [''],
      instructions:   [''],
      mode:           ['OPEN_AMOUNT', Validators.required],
      currency:       ['GHS', Validators.required],
      allowedAssets:  [['USDT'], Validators.required],
      allowedNetworks:['TRC20', Validators.required],
      defaultAsset:   ['USDT', Validators.required],
      defaultNetwork: ['TRC20', Validators.required],
    });

    // Auto-generate standCode from standName
    this.form.get('standName')?.valueChanges.subscribe(v => {
      const code = (v ?? '').toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
      this.form.get('standCode')?.setValue(code, { emitEvent: false });
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.standService.list().subscribe({
      next: res => { this.stands = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  toggleAsset(asset: string): void {
    const curr: string[] = this.form.get('allowedAssets')?.value ?? [];
    const next = curr.includes(asset) ? curr.filter(a => a !== asset) : [...curr, asset];
    this.form.get('allowedAssets')?.setValue(next);
  }

  isAssetSelected(asset: string): boolean {
    return (this.form.get('allowedAssets')?.value ?? []).includes(asset);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = {
      ...this.form.value,
      allowedNetworks: [this.form.get('allowedNetworks')?.value]
    };
    this.standService.create(payload).subscribe({
      next: res => {
        this.toast.success(`Payment stand "${res.data.standName}" created!`);
        this.showForm = false;
        this.form.reset({ mode: 'OPEN_AMOUNT', currency: 'GHS', defaultAsset: 'USDT', defaultNetwork: 'TRC20', allowedAssets: ['USDT'], allowedNetworks: 'TRC20' });
        this.load();
      },
      error: () => { this.saving = false; },
      complete: () => { this.saving = false; }
    });
  }

  disable(stand: PaymentStand): void {
    const id = stand.standId ?? stand._id ?? '';
    this.disablingId = id;
    this.standService.disable(id).subscribe({
      next: () => { this.toast.success('Stand disabled'); this.load(); this.disablingId = null; },
      error: () => { this.disablingId = null; }
    });
  }

  viewStand(stand: PaymentStand): void {
    this.selectedStand = this.selectedStand?._id === stand._id ? null : stand;
  }

  copyUrl(url: string): void { navigator.clipboard.writeText(url); this.toast.success('Copied!'); }
  openPrint(url: string): void { window.open(url, '_blank'); }

  f(n: string) { return this.form.get(n)!; }
}
