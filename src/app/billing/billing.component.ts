import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BillingService } from '../core/services/billing.service';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import {
  BillingPlan,
  BillingSubscription,
  BillingUsage,
  BillingBill,
} from '../core/models';
import { ConfirmModalService } from '../core/services/confirm-modal.service';

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
  activeTab: 'overview' | 'bills' | 'wallets' = 'overview';
  payForm: FormGroup;
  showPayForm: string | null = null;

  // ── Billing Wallets ───────────────────────────────────────────────────────
  billingWallets: any[] = [];
  walletsLoading = false;
  walletsLoaded = false;
  showWalletForm = false;
  savingWallet = false;
  walletForm: FormGroup;

  // ── Bill expand / copy ────────────────────────────────────────────────────
  expandedBillId: string | null = null;
  copiedAddress: string | null = null;

  /** True when the backend reports PAY_AS_YOU_GO billing mode */
  get isPayg(): boolean {
    return (this.subscription as any)?.billingMode === 'PAY_AS_YOU_GO';
  }

  constructor(
    public auth: AuthService,
    private billingSvc: BillingService,
    private toast: ToastService,
    private fb: FormBuilder,
    private confirmModal: ConfirmModalService,
  ) {
    this.payForm = this.fb.group({
      asset: ['USDT', Validators.required],
      network: ['TRC20', Validators.required],
    });

    this.walletForm = this.fb.group({
      environment: ['LIVE', Validators.required],
      asset: ['USDT', Validators.required],
      network: ['TRC20', Validators.required],
      address: ['', Validators.required],
      label: [''],
      isDefault: [true],
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  switchTab(tab: 'overview' | 'bills' | 'wallets'): void {
    this.activeTab = tab;
    if (tab === 'wallets' && !this.walletsLoaded) {
      this.loadWallets();
    }
  }

  loadAll(): void {
    this.loading = true;
    Promise.all([
      this.billingSvc.getPlans().toPromise(),
      this.billingSvc.getSubscription().toPromise(),
      this.billingSvc.getUsage().toPromise(),
      this.billingSvc.getBills().toPromise(),
    ])
      .then(([plans, sub, usage, bills]) => {
        this.plans = (plans as any)?.data ?? [];

        const subData = (sub as any)?.data;
        this.subscription = subData?.subscription ?? subData ?? null;

        const usageData = (usage as any)?.data;
        if (usageData?.items) {
          const detections = usageData.items.find((i: any) =>
            i.eventType?.includes('DETECTION'),
          );
          const invoices = usageData.items.find((i: any) =>
            i.eventType?.includes('INVOICE'),
          );
          const webhooks = usageData.items.find((i: any) =>
            i.eventType?.includes('WEBHOOK'),
          );
          const usageBase: BillingUsage = {
            detections: detections?.quantity ?? 0,
            invoicesCreated: invoices?.quantity ?? 0,
            webhooksSent: webhooks?.quantity ?? 0,
            period: usageData.period
              ? `${new Date(usageData.period.from).toLocaleDateString()} – ${new Date(usageData.period.to).toLocaleDateString()}`
              : 'Current period',
          };
          (usageBase as any).totalBillableEvents = usageData.totalBillableEvents ?? null;
          (usageBase as any).estimatedAmount = usageData.estimatedAmount ?? null;
          (usageBase as any).currency = usageData.currency ?? null;
          this.usage = usageBase;
        } else {
          this.usage = usageData ?? null;
        }

        this.bills = ((bills as any)?.data ?? []).map((b: any) => ({
          ...b,
          billId: b._id,
          period:
            b.periodStart && b.periodEnd
              ? `${new Date(b.periodStart).toLocaleDateString()} – ${new Date(b.periodEnd).toLocaleDateString()}`
              : null,
          dueDate: b.dueAt ?? null,
        }));
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
      });
  }

  // ── Billing Wallets ───────────────────────────────────────────────────────
  // ── Bill expand / copy ────────────────────────────────────────────────────
  toggleBill(billId: string): void {
    this.expandedBillId = this.expandedBillId === billId ? null : billId;
    if (this.expandedBillId !== billId) this.showPayForm = null;
  }

  copyAddress(address: string): void {
    navigator.clipboard.writeText(address).then(() => {
      this.copiedAddress = address;
      setTimeout(() => (this.copiedAddress = null), 2500);
    });
  }

  loadWallets(): void {
    this.walletsLoading = true;
    this.billingSvc.listBillingWallets().subscribe({
      next: (res) => {
        this.billingWallets = (res as any)?.data ?? [];
        this.walletsLoading = false;
        this.walletsLoaded = true;
      },
      error: () => {
        this.walletsLoading = false;
        this.walletsLoaded = true;
      },
    });
  }

  openWalletForm(): void {
    this.showWalletForm = true;
    // Pre-fill environment from current auth context
    const env = this.auth.auth?.environment ?? 'LIVE';
    this.walletForm.reset({
      environment: env,
      asset: 'USDT',
      network: 'TRC20',
      address: '',
      label: '',
      isDefault: true,
    });
  }

  cancelWalletForm(): void {
    this.showWalletForm = false;
    this.walletForm.reset();
  }

  saveWallet(): void {
    if (this.walletForm.invalid) return;
    this.savingWallet = true;
    const { environment, asset, network, address, label, isDefault } =
      this.walletForm.value;
    this.billingSvc
      .createBillingWallet({ environment, asset, network, address, label, isDefault })
      .subscribe({
        next: () => {
          this.toast.success('Billing wallet saved');
          this.showWalletForm = false;
          this.savingWallet = false;
          this.loadWallets();
        },
        error: () => {
          this.savingWallet = false;
        },
      });
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  async changePlan(planCode: string): Promise<void> {
    if (planCode === this.subscription?.planCode) return;

    const planName =
      this.plans.find((p) => p.code === planCode)?.name ?? planCode;
    const isFree = planCode === 'FREE';

    const confirmed = await this.confirmModal.confirm({
      title: `Switch to ${planName}`,
      message: isFree
        ? "You'll lose access to paid features immediately. Are you sure?"
        : `Your subscription will be updated to the ${planName} plan. You can change this at any time.`,
      confirmLabel: `Switch to ${planName}`,
      cancelLabel: 'Keep current plan',
      danger: isFree,
    });

    if (!confirmed) return;

    this.changingPlan = true;
    this.billingSvc
      .changePlan(planCode, 'Merchant-initiated plan change')
      .subscribe({
        next: () => {
          this.toast.success('Plan changed!');
          this.loadAll();
        },
        error: () => {
          this.changingPlan = false;
        },
        complete: () => {
          this.changingPlan = false;
        },
      });
  }

  generateBill(): void {
    this.generatingBill = true;
    this.billingSvc.generateCurrentBill().subscribe({
      next: (res) => {
        this.toast.success(`Bill ${res.data.billNumber} generated`);
        this.loadAll();
      },
      error: () => {
        this.generatingBill = false;
      },
      complete: () => {
        this.generatingBill = false;
      },
    });
  }

  openPayForm(billId: string): void {
    this.showPayForm = billId;
    this.payForm.reset({ asset: 'USDT', network: 'TRC20' });
  }

  async payBill(billId: string): Promise<void> {
    if (this.payForm.invalid) return;
    const { asset, network } = this.payForm.value;

    const confirmed = await this.confirmModal.confirm({
      title: 'Confirm crypto payment',
      message: `You'll receive a ${asset} (${network}) deposit address. Send the exact amount shown to complete payment.`,
      confirmLabel: 'Get payment address',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    this.payingBillId = billId;
    this.billingSvc.payBillCrypto(billId, asset, network).subscribe({
      next: (res) => {
        this.toast.success(
          'Payment intent created — send crypto to the address shown',
        );
        this.showPayForm = null;
        const addr = res.data.payment.receivingAddress;
        const amount = res.data.payment.expectedCryptoAmount;
        this.toast.success(`Send ${amount} ${asset} to: ${addr}`);
        this.loadAll();
      },
      error: () => {
        this.payingBillId = null;
      },
      complete: () => {
        this.payingBillId = null;
      },
    });
  }

  isCurrent(plan: BillingPlan): boolean {
    return plan.code === this.subscription?.planCode;
  }

  copyApiKey(): void {
    const key = this.auth.auth?.apiKey;
    if (key) {
      navigator.clipboard.writeText(key);
      this.toast.success('API key copied!');
    }
  }
}
