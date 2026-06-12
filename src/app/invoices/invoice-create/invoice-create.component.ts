import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InvoiceService } from '../../core/services/invoice.service';
import { RateService } from '../../core/services/rate.service';
import { WalletService } from '../../core/services/wallet.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmModalService } from '../../core/services/confirm-modal.service';
import { RateQuote, WalletProfile } from '../../core/models';

@Component({ selector: 'app-invoice-create', templateUrl: './invoice-create.component.html' })
export class InvoiceCreateComponent implements OnInit {
  form: FormGroup;
  loading = false;
  quoting = false;
  quote: RateQuote | null = null;
  wallets: WalletProfile[] = [];

  currencies = ['GHS', 'USD', 'NGN', 'CAD', 'EUR'];
  assets = ['USDT', 'BTC', 'USDC'];
  networks: Record<string, string[]> = {
    USDT: ['TRC20', 'BEP20', 'SOLANA'],
    USDC: ['POLYGON', 'SOLANA'],
    BTC:  ['BTC']
  };

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private rateService: RateService,
    private walletService: WalletService,
    private router: Router,
    private toast: ToastService,
    private confirmModal: ConfirmModalService
  ) {
    this.form = this.fb.group({
      payerName:       ['', Validators.required],
      payerEmail:      ['', [Validators.required, Validators.email]],
      payerPhone:      [''],
      amount:          [null, [Validators.required, Validators.min(1)]],
      currency:        ['GHS', Validators.required],
      asset:           ['USDT', Validators.required],
      network:         ['TRC20', Validators.required],
      description:     [''],
      forceRateRefresh:[true]
    });
  }

  ngOnInit(): void {
    this.walletService.list().subscribe({ next: res => { this.wallets = res.data ?? []; } });
    this.form.get('asset')?.valueChanges.subscribe(asset => {
      const nets = this.networks[asset] ?? [];
      this.form.get('network')?.setValue(nets[0] ?? '');
      this.quote = null;
    });
  }

  get availableNetworks(): string[] { return this.networks[this.form.get('asset')?.value] ?? []; }

  getQuote(): void {
    const { amount, currency, asset } = this.form.value;
    if (!amount || !currency || !asset) return;
    this.quoting = true;
    this.rateService.getQuote(amount, currency, asset, true).subscribe({
      next: res => { this.quote = res.data; this.quoting = false; },
      error: () => { this.quoting = false; }
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.invoiceService.create(this.form.value).subscribe({
      next: res => {
        const inv = res.data.invoice;
        const num = inv.invoiceNumber || inv.invoiceId;
        this.toast.success(`Invoice ${num} created!`);
        const id = inv.invoiceId ?? inv._id;
        this.router.navigate(['/invoices', id]);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.handleCreateError(err);
      }
    });
  }

  private async handleCreateError(err: any): Promise<void> {
    const message: string = err?.error?.message || '';

    // Backend returns: "No active default {ASSET}/{NETWORK} wallet profile found for this business"
    const isMissingWallet = /wallet profile/i.test(message);

    if (isMissingWallet) {
      const { asset, network } = this.form.value;
      const confirmed = await this.confirmModal.confirm({
        title: 'Wallet Required',
        message: `You don't have a receiving wallet set up for ${asset} on the ${network} network yet. Add one to your Wallets to start accepting payments on this network.`,
        confirmLabel: 'Go to Wallets',
        cancelLabel: 'Stay here',
        danger: false
      });

      if (confirmed) {
        this.router.navigate(['/wallets']);
      }
      return;
    }

    // Fallback for any other error
    this.toast.error(message || 'Failed to create invoice. Please try again.');
  }

  f(n: string) { return this.form.get(n)!; }
}
