import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BillingService } from '../core/services/billing.service';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { BillingPlan, BillingSubscription, BillingUsage, BillingBill } from '../core/models';

@Component({ selector: 'app-billing', templateUrl: './billing.component.html' })
export class BillingComponent implements OnInit {
  plans: BillingPlan[] = [];
  subscription: BillingSubscription | null = null;
  usage: BillingUsage | null = null;
  bills: BillingBill[] = [];
  loading = true;
  changingPlan = false;
  generatingBill = false;
  payingBillId: string | null = null;
  activeTab: 'overview' | 'bills' = 'overview';
  payForm: FormGroup;
  showPayForm: string | null = null; // billId being paid

  constructor(
    public auth: AuthService,
    private billingSvc: BillingService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.payForm = this.fb.group({
      asset:   ['USDT', Validators.required],
      network: ['TRC20', Validators.required]
    });
  }

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    Promise.all([
      this.billingSvc.getPlans().toPromise(),
      this.billingSvc.getSubscription().toPromise(),
      this.billingSvc.getUsage().toPromise(),
      this.billingSvc.getBills().toPromise()
    ]).then(([plans, sub, usage, bills]) => {
      this.plans        = (plans as any)?.data ?? [];
      this.subscription = (sub as any)?.data ?? null;
      this.usage        = (usage as any)?.data ?? null;
      this.bills        = (bills as any)?.data ?? [];
      this.loading      = false;
    }).catch(() => { this.loading = false; });
  }

  changePlan(planCode: string): void {
    if (planCode === this.subscription?.planCode) return;
    if (!confirm(`Switch to the ${planCode} plan?`)) return;
    this.changingPlan = true;
    this.billingSvc.changePlan(planCode, 'Merchant-initiated plan change').subscribe({
      next: () => { this.toast.success('Plan changed!'); this.loadAll(); },
      error: () => { this.changingPlan = false; },
      complete: () => { this.changingPlan = false; }
    });
  }

  generateBill(): void {
    this.generatingBill = true;
    this.billingSvc.generateCurrentBill().subscribe({
      next: res => { this.toast.success(`Bill ${res.data.billNumber} generated`); this.loadAll(); },
      error: () => { this.generatingBill = false; },
      complete: () => { this.generatingBill = false; }
    });
  }

  openPayForm(billId: string): void {
    this.showPayForm = billId;
    this.payForm.reset({ asset: 'USDT', network: 'TRC20' });
  }

  payBill(billId: string): void {
    if (this.payForm.invalid) return;
    this.payingBillId = billId;
    const { asset, network } = this.payForm.value;
    this.billingSvc.payBillCrypto(billId, asset, network).subscribe({
      next: res => {
        this.toast.success('Payment intent created — send crypto to the address shown');
        this.showPayForm = null;
        alert(`Send ${res.data.payment.expectedCryptoAmount} ${asset} to:\n${res.data.payment.receivingAddress}`);
        this.loadAll();
      },
      error: () => { this.payingBillId = null; },
      complete: () => { this.payingBillId = null; }
    });
  }

  isCurrent(plan: BillingPlan): boolean {
    return plan.code === this.subscription?.planCode;
  }

  copyApiKey(): void {
    const key = this.auth.auth?.apiKey;
    if (key) { navigator.clipboard.writeText(key); this.toast.success('API key copied!'); }
  }
}
