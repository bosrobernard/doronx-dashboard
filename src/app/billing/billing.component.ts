import { Component, OnInit, OnDestroy } from '@angular/core';
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

/** Payment statuses that mean we should keep polling */
const PENDING_STATUSES = new Set([
  'AWAITING_PAYMENT',
  'PAYMENT_DETECTED',
  'CONFIRMING',
]);

/** Poll every 8 seconds while a bill is awaiting payment */
const POLL_INTERVAL_MS = 8000;

@Component({ selector: 'app-billing', templateUrl: './billing.component.html' })
export class BillingComponent implements OnInit, OnDestroy {
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

  // ── Payment polling ───────────────────────────────────────────────────────
  private pollTimer: any = null;
  pollingBillId: string | null = null;

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

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  switchTab(tab: 'overview' | 'bills' | 'wallets'): void {
    this.activeTab = tab;
    if (tab === 'wallets' && !this.walletsLoaded) {
      this.loadWallets();
    }
  }

  // ── Load all data ─────────────────────────────────────────────────────────
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

  // ── Bill expand / copy ────────────────────────────────────────────────────
  toggleBill(billId: string): void {
    if (this.expandedBillId === billId) {
      this.expandedBillId = null;
      this.showPayForm = null;
      this.stopPolling();
    } else {
      this.expandedBillId = billId;
      const bill = this.bills.find(b => b._id === billId);
      if (bill && PENDING_STATUSES.has(bill.paymentStatus ?? '')) {
        this.startPolling(billId);
      }
    }
  }

  copyAddress(address: string): void {
    navigator.clipboard.writeText(address).then(() => {
      this.copiedAddress = address;
      setTimeout(() => (this.copiedAddress = null), 2500);
    });
  }

  // ── Payment polling ───────────────────────────────────────────────────────
  private startPolling(billId: string): void {
    this.stopPolling();
    this.pollingBillId = billId;
    this.pollTimer = setInterval(() => this.pollBill(billId), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.pollingBillId = null;
  }

  private pollBill(billId: string): void {
    if (this.expandedBillId !== billId) {
      this.stopPolling();
      return;
    }

    this.billingSvc.getBillById(billId).subscribe({
      next: (res) => {
        const updated: BillingBill = (res as any)?.data ?? res;
        const idx = this.bills.findIndex(b => b._id === billId);
        if (idx !== -1) {
          this.bills[idx] = { ...this.bills[idx], ...updated };
        }

        const status = updated.paymentStatus;

        if (status === 'PAYMENT_DETECTED' || status === 'CONFIRMING') {
          this.toast.success('Payment detected — confirming on-chain…');
        }

        if (status === 'PAID') {
          this.toast.success('Bill paid successfully!');
          this.stopPolling();
          this.loadAll();
          return;
        }

        if (status === 'FAILED' || status === 'EXPIRED') {
          this.toast.success(`Payment ${status?.toLowerCase()} — please try again.`);
          this.stopPolling();
          return;
        }

        if (!PENDING_STATUSES.has(status ?? '')) {
          this.stopPolling();
        }
      },
      error: () => {
        // Transient error — try again next tick
      },
    });
  }

  private startPollingAfterPay(billId: string): void {
    setTimeout(() => {
      if (this.expandedBillId === billId) {
        this.startPolling(billId);
      }
    }, 2000);
  }

  // ── Billing Wallets ───────────────────────────────────────────────────────
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
      next: () => {
        this.toast.success('Payment intent created — send crypto to the address shown');
        this.showPayForm = null;
        this.loadAll();
        this.startPollingAfterPay(billId);
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
