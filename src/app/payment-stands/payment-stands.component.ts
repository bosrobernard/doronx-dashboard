import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PaymentStandService } from '../core/services/payment-stand.service';
import { CryptoService } from '../core/services/crypto.service';
import { ToastService } from '../core/services/toast.service';
import { PaymentStand } from '../core/models';

type InputMode = 'LOCAL' | 'ASSET';

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

  // ── Edit support ───────────────────────────────────────────────────
  editStandId: string | null = null;

  // ── Conversion support ─────────────────────────────────────────────
  inputMode: InputMode = 'LOCAL';
  isConverting = false;
  conversionResult: { assetAmount: string; localAmount: string } | null = null;
  private usdtTradePair: any = null;
  private btcTradePair: any = null;

  loadingDetailId: string | null = null;

  assets = ['USDT', 'BTC', 'USDC'];
  networks = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];
  currencies = ['GHS', 'USD', 'NGN', 'CAD', 'EUR'];

  private readonly USDT_NETWORKS = ['TRC20', 'BEP20', 'SOLANA'];
  private readonly BTC_NETWORKS = ['BTC'];

  // narrows when BTC is selected
  availableNetworks: string[] = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];

  constructor(
    private standService: PaymentStandService,
    private cryptoService: CryptoService,
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

    // Auto-generate standCode from standName (skip when editing)
    this.form.get('standName')?.valueChanges.subscribe((v) => {
      if (this.editStandId) return;
      const code = (v ?? '')
        .toUpperCase()
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '');
      this.form.get('standCode')?.setValue(code, { emitEvent: false });
    });

    this.form.get('defaultNetwork')?.valueChanges.subscribe((network) => {
      const curr: string[] = this.form.get('allowedNetworks')?.value ?? [];
      if (network && !curr.includes(network)) {
        this.form.get('allowedNetworks')?.setValue([...curr, network]);
      }
      this.onDefaultNetworkChange(network);
    });

    this.form.get('defaultAsset')?.valueChanges.subscribe((asset) => {
      const curr: string[] = this.form.get('allowedAssets')?.value ?? [];
      if (asset && !curr.includes(asset)) {
        this.form.get('allowedAssets')?.setValue([...curr, asset]);
      }
      this.onDefaultAssetChange(asset);
      this.triggerConversion();
    });

    // Re-trigger conversion when the invoice currency changes
    this.form.get('currency')?.valueChanges.subscribe(() => {
      this.conversionResult = null;
      this.loadTradePairs();
    });

    this.form.get('mode')?.valueChanges.subscribe((mode) => {
      const fixedAmountCtrl = this.form.get('fixedAmount');
      if (mode === 'FIXED_AMOUNT') {
        fixedAmountCtrl?.setValidators([
          Validators.required,
          Validators.min(1),
        ]);
      } else {
        fixedAmountCtrl?.clearValidators();
        fixedAmountCtrl?.setValue(null);
        this.conversionResult = null;
      }
      fixedAmountCtrl?.updateValueAndValidity();
    });

    this.form
      .get('fixedAmount')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((value) => {
        if (value && Number(value) > 0) {
          this.triggerConversion();
        } else {
          this.conversionResult = null;
        }
      });
  }

  ngOnInit(): void {
    this.loadTradePairs();
    this.load();
  }

  // ── Trade pair loading ─────────────────────────────────────────────

  private async loadTradePairs(): Promise<void> {
    const currency = this.form.get('currency')?.value || 'GHS';
    try {
      const [usdtRes, btcRes] = await Promise.all([
        firstValueFrom(this.cryptoService.getTradePairs('USDT', currency)),
        firstValueFrom(this.cryptoService.getTradePairs('BTC', currency)),
      ]);
      if (usdtRes?.success && usdtRes.data?.length)
        this.usdtTradePair = usdtRes.data[0];
      if (btcRes?.success && btcRes.data?.length)
        this.btcTradePair = btcRes.data[0];
    } catch {
      // non-fatal; conversion just won't show
    }
  }

  // ── BTC network lock ────────────────────────────────────────────────

  private onDefaultAssetChange(asset: string): void {
    if (asset === 'BTC') {
      this.availableNetworks = [...this.BTC_NETWORKS];
      this.form.patchValue({ defaultNetwork: 'BTC' }, { emitEvent: false });
      this.form.patchValue({ allowedNetworks: ['BTC'] }, { emitEvent: false });
    } else {
      this.availableNetworks = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];
      const cur = this.form.get('defaultNetwork')?.value;
      if (!this.USDT_NETWORKS.includes(cur)) {
        this.form.patchValue({ defaultNetwork: 'TRC20' }, { emitEvent: false });
      }
    }
  }

  private onDefaultNetworkChange(net: string): void {
    if (net === 'BTC' && this.form.get('defaultAsset')?.value !== 'BTC') {
      this.form.patchValue({ defaultAsset: 'BTC' }, { emitEvent: false });
      this.availableNetworks = [...this.BTC_NETWORKS];
    } else if (
      this.USDT_NETWORKS.includes(net) &&
      this.form.get('defaultAsset')?.value === 'BTC'
    ) {
      this.form.patchValue({ defaultAsset: 'USDT' }, { emitEvent: false });
      this.availableNetworks = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];
    }
  }

  isNetworkLocked(): boolean {
    return this.availableNetworks.length === 1;
  }

  // ── Conversion logic ────────────────────────────────────────────────

  private getTradePair(): any {
    const asset = this.form.get('defaultAsset')?.value;
    return asset === 'BTC' ? this.btcTradePair : this.usdtTradePair;
  }

  private async triggerConversion(): Promise<void> {
    if (this.form.get('mode')?.value !== 'FIXED_AMOUNT') return;

    const amount = this.form.get('fixedAmount')?.value;
    if (!amount || Number(amount) <= 0) {
      this.conversionResult = null;
      return;
    }

    const tradePair = this.getTradePair();
    if (!tradePair) return;

    const inputAsset = this.inputMode === 'LOCAL' ? 'QUOTE' : 'BASE';
    this.isConverting = true;

    try {
      const res = await firstValueFrom(
        this.cryptoService.convertByInput({
          tradePairId: tradePair._id,
          side: 'BUY',
          amount: String(amount),
          inputAsset,
        }),
      );

      if (res?.success) {
        const data = res.data;
        if (this.inputMode === 'LOCAL') {
          this.conversionResult = {
            assetAmount: Number(data.outputAmount).toFixed(8),
            localAmount: String(amount),
          };
        } else {
          this.conversionResult = {
            assetAmount: String(amount),
            localAmount: Number(data.outputAmount).toFixed(2),
          };
        }
      }
    } catch {
      this.conversionResult = null;
    } finally {
      this.isConverting = false;
    }
  }

  toggleInputMode(): void {
    if (this.isConverting) return;
    this.inputMode = this.inputMode === 'LOCAL' ? 'ASSET' : 'LOCAL';

    if (this.conversionResult) {
      const newValue =
        this.inputMode === 'LOCAL'
          ? this.conversionResult.localAmount
          : this.conversionResult.assetAmount;
      this.form.get('fixedAmount')?.setValue(newValue, { emitEvent: false });
    }
    this.conversionResult = null;
    this.triggerConversion();
  }

  get amountSuffix(): string {
    if (this.inputMode === 'LOCAL')
      return this.form.get('currency')?.value || 'GHS';
    return this.form.get('defaultAsset')?.value || 'USDT';
  }

  get conversionHint(): string {
    if (!this.conversionResult) return '';
    const asset = this.form.get('defaultAsset')?.value || 'USDT';
    const currency = this.form.get('currency')?.value || 'GHS';
    if (this.inputMode === 'LOCAL') {
      return `≈ ${this.conversionResult.assetAmount} ${asset}`;
    }
    return `≈ ${this.getCurrencySymbol(currency)}${this.conversionResult.localAmount} ${currency}`;
  }

  getCurrencySymbol(currency?: string): string {
    const map: Record<string, string> = {
      GHS: '₵',
      USD: '$',
      CAD: 'C$',
      NGN: '₦',
      EUR: '€',
      GBP: '£',
    };
    return map[currency ?? ''] ?? currency ?? '';
  }

  // ── List / CRUD ──────────────────────────────────────────────────────

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
    if (asset === this.form.get('defaultAsset')?.value && curr.includes(asset))
      return;
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
    if (
      network === this.form.get('defaultNetwork')?.value &&
      curr.includes(network)
    )
      return;
    this.form.get('allowedNetworks')?.setValue(next);
  }

  isNetworkSelected(network: string): boolean {
    return (this.form.get('allowedNetworks')?.value ?? []).includes(network);
  }

  // ── Edit support ─────────────────────────────────────────────────────

  editStand(stand: PaymentStand): void {
    this.selectedStand = null;
    this.editStandId = stand.standId ?? stand._id ?? null;
    this.showForm = true;
    this.inputMode = 'LOCAL';
    this.conversionResult = null;

    if (stand.defaultAsset === 'BTC') {
      this.availableNetworks = [...this.BTC_NETWORKS];
    } else {
      this.availableNetworks = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];
    }

    this.form.patchValue({
      standName: stand.standName,
      standCode: stand.standCode,
      location: stand.location ?? '',
      tableNumber: stand.tableNumber ?? '',
      instructions: stand.instructions ?? '',
      mode: stand.mode,
      fixedAmount: stand.fixedAmount ?? null,
      currency: stand.currency ?? 'GHS',
      allowedAssets: stand.allowedAssets ?? ['USDT'],
      allowedNetworks: stand.allowedNetworks ?? ['TRC20'],
      defaultAsset: stand.defaultAsset ?? 'USDT',
      defaultNetwork: stand.defaultNetwork ?? 'TRC20',
    });

    if (stand.mode === 'FIXED_AMOUNT') {
      const ctrl = this.form.get('fixedAmount');
      ctrl?.setValidators([Validators.required, Validators.min(1)]);
      ctrl?.updateValueAndValidity();
    }

    this.loadTradePairs();
  }

  cancelEdit(): void {
    this.editStandId = null;
    this.showForm = false;
    this.conversionResult = null;
    this.inputMode = 'LOCAL';
    this.availableNetworks = ['TRC20', 'BEP20', 'SOLANA', 'BTC'];
    this.form.reset({
      mode: 'OPEN_AMOUNT',
      currency: 'GHS',
      defaultAsset: 'USDT',
      defaultNetwork: 'TRC20',
      allowedAssets: ['USDT'],
      allowedNetworks: ['TRC20'],
      fixedAmount: null,
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (
      this.form.get('mode')?.value === 'FIXED_AMOUNT' &&
      this.inputMode === 'LOCAL' &&
      !this.conversionResult
    ) {
      this.toast.warning(
        'Waiting for rate conversion. Please try again in a moment.',
      );
      return;
    }

    this.saving = true;

    const formValue = this.form.value;
    const payload: any = { ...formValue };

    if (payload.mode !== 'FIXED_AMOUNT') {
      delete payload.fixedAmount;
    } else {
      payload.fixedAmount =
        this.inputMode === 'ASSET'
          ? Number(formValue.fixedAmount)
          : Number(this.conversionResult?.assetAmount ?? formValue.fixedAmount);
    }

    const request$ = this.editStandId
      ? this.standService.update(this.editStandId, payload)
      : this.standService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.toast.success(
          this.editStandId
            ? `Payment stand "${res.data?.standName ?? 'Stand'}" updated!`
            : `Payment stand "${res.data?.standName ?? 'Stand'}" created!`,
        );
        this.cancelEdit();
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

    // Toggle off if same card
    if (selectedId === id) {
      this.selectedStand = null;
      return;
    }

    // Close any currently open card first
    this.selectedStand = null;

    if (stand.qrCode || stand.publicUrl) {
      this.selectedStand = stand;
      return;
    }

    this.loadingDetailId = id ?? null;
    this.standService.getById(id!).subscribe({
      next: (res) => {
        const idx = this.stands.findIndex((s) => (s.standId ?? s._id) === id);
        if (idx > -1) {
          this.stands[idx] = { ...this.stands[idx], ...res.data };
          this.selectedStand = this.stands[idx];
        }
        this.loadingDetailId = null;
      },
      error: () => {
        this.selectedStand = stand;
        this.loadingDetailId = null;
      },
    });
  }

  copyUrl(url: string): void {
    navigator.clipboard.writeText(url);
    this.toast.success('Copied!');
  }

  openPrint(url: string): void {
    const printWindow = window.open(url, '_blank');
    if (!printWindow) {
      this.toast.warning('Please allow popups to print the QR code.');
      return;
    }
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }

  f(n: string) {
    return this.form.get(n)!;
  }
}
