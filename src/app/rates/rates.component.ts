import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RateService } from '../core/services/rate.service';
import { ToastService } from '../core/services/toast.service';
import { TradePair, RateQuote } from '../core/models';

@Component({ selector: 'app-rates', templateUrl: './rates.component.html' })
export class RatesComponent implements OnInit {
  tradePairs: TradePair[] = [];
  loading = true;
  showPairForm = false;
  savingPair = false;
  pairForm: FormGroup;

  quoteForm: FormGroup;
  quoting = false;
  quote: RateQuote | null = null;
  refreshingId: string | null = null;

  currencies = ['GHS', 'USD', 'NGN', 'CAD', 'EUR'];
  assets = ['USDT', 'BTC', 'ETH'];
  allNetworks = ['TRC20', 'BEP20', 'SOLANA', 'POLYGON', 'BTC'];
  rateSources = ['KRAKEN_FIXER_CROSS'];
  pricingModes = ['AUTO', 'MANUAL'];

  constructor(
    private rateService: RateService,
    private fb: FormBuilder,
    private toast: ToastService
  ) {
    this.pairForm = this.fb.group({
      baseAsset: ['USDT', Validators.required],
      quoteCurrency: ['GHS', Validators.required],
      allowedNetworks: [['TRC20', 'BEP20', 'SOLANA'], Validators.required],
      markupPercent: [2, [Validators.required, Validators.min(0), Validators.max(50)]],
      spreadPercent: [0, [Validators.required, Validators.min(0)]],
      rateSource: ['KRAKEN_FIXER_CROSS', Validators.required],
      pricingMode: ['AUTO', Validators.required],
      minInvoiceAmount: [10, Validators.required],
      maxInvoiceAmount: [100000, Validators.required],
      rateTtlSeconds: [600, Validators.required]
    });

    this.quoteForm = this.fb.group({
      amount: [1000, [Validators.required, Validators.min(1)]],
      invoiceCurrency: ['GHS', Validators.required],
      paymentAsset: ['USDT', Validators.required]
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.rateService.listTradePairs().subscribe({
      next: res => { this.tradePairs = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  toggleNetwork(net: string): void {
    const current: string[] = this.pairForm.get('allowedNetworks')?.value ?? [];
    const updated = current.includes(net) ? current.filter(n => n !== net) : [...current, net];
    this.pairForm.get('allowedNetworks')?.setValue(updated);
  }

  isNetworkSelected(net: string): boolean {
    return (this.pairForm.get('allowedNetworks')?.value ?? []).includes(net);
  }

  savePair(): void {
    if (this.pairForm.invalid) { this.pairForm.markAllAsTouched(); return; }
    this.savingPair = true;
    this.rateService.createTradePair(this.pairForm.value).subscribe({
      next: () => {
        this.toast.success('Trade pair saved!');
        this.showPairForm = false;
        this.load();
      },
      error: () => { this.savingPair = false; },
      complete: () => { this.savingPair = false; }
    });
  }

  refreshRate(id: string): void {
    this.refreshingId = id;
    this.rateService.refreshRate(id).subscribe({
      next: () => { this.toast.success('Rate refreshed'); this.refreshingId = null; },
      error: () => { this.refreshingId = null; }
    });
  }

  getQuote(): void {
    if (this.quoteForm.invalid) return;
    this.quoting = true;
    this.quote = null;
    const { amount, invoiceCurrency, paymentAsset } = this.quoteForm.value;
    this.rateService.getQuote(amount, invoiceCurrency, paymentAsset, true).subscribe({
      next: res => { this.quote = res.data; this.quoting = false; },
      error: () => { this.quoting = false; }
    });
  }

  pf(n: string) { return this.pairForm.get(n)!; }
  qf(n: string) { return this.quoteForm.get(n)!; }
}
