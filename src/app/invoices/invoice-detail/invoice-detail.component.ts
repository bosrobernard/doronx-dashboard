import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { InvoiceService } from '../../core/services/invoice.service';
import { ToastService } from '../../core/services/toast.service';
import { Invoice, PaymentIntent } from '../../core/models';

// Statuses that will never change again — stop polling once we hit one of these
const TERMINAL_STATUSES = ['PAID', 'EXPIRED', 'FAILED', 'CANCELLED', 'UNDERPAID', 'OVERPAID'];

// How often to re-check the invoice while it's still pending
const POLL_INTERVAL_MS = 8000;

@Component({ selector: 'app-invoice-detail', templateUrl: './invoice-detail.component.html' })
export class InvoiceDetailComponent implements OnInit, OnDestroy {
  invoice: Invoice | null = null;
  paymentIntent: PaymentIntent | null = null;
  paymentUrl = '';
  qrCodeUrl = '';
  detection: any = null;
  timeline: any[] = [];
  loading = true;
  registeringDetection = false;
  downloadingQr = false;

  isPolling = false;

  private invoiceId = '';
  private pollSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id')!;
    this.loadInvoice(true);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // --- Data loading ---------------------------------------------------

  private loadInvoice(isInitial: boolean): void {
    this.invoiceService.getById(this.invoiceId).subscribe({
      next: res => this.handleInvoiceResponse(res.data, isInitial),
      error: () => {
        if (isInitial) this.loading = false;
      }
    });
  }

  private handleInvoiceResponse(d: any, isInitial: boolean): void {
    const previousStatus = this.invoice?.status;

    this.invoice = d.invoice;
    this.paymentIntent = d.paymentIntent;

    this.paymentUrl =
      d.invoice?.paymentUrl ??
      d.payment?.paymentUrl ??
      d.paymentUrl ??
      '';

    this.qrCodeUrl =
      d.payment?.qrCodeUrl ??
      d.invoice?.paymentQr?.qrCodeUrl ??
      d.paymentIntent?.paymentQr?.qrCodeUrl ??
      '';

    this.detection = d.detection ?? null;
    this.timeline = d.timeline ?? [];

    if (isInitial) {
      this.loading = false;
      this.startPolling();
      return;
    }

    // Status changed mid-poll — let the user know
    if (previousStatus && this.invoice && previousStatus !== this.invoice.status) {
      this.toast.success(`Invoice status changed: ${previousStatus} → ${this.invoice.status}`);
    }

    if (this.invoice && TERMINAL_STATUSES.includes(this.invoice.status)) {
      this.stopPolling();
    }
  }

  // --- Polling ----------------------------------------------------------

  private startPolling(): void {
    if (this.pollSub || !this.invoice) return;
    if (TERMINAL_STATUSES.includes(this.invoice.status)) return;

    this.isPolling = true;
    this.pollSub = interval(POLL_INTERVAL_MS)
      .pipe(switchMap(() => this.invoiceService.getById(this.invoiceId)))
      .subscribe({
        next: res => this.handleInvoiceResponse(res.data, false),
        error: () => {
          // transient network errors shouldn't kill the poll — just try again next tick
        }
      });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.isPolling = false;
  }

  /** Lets the user trigger an immediate check without waiting for the next tick */
  refreshNow(): void {
    this.loadInvoice(false);
  }

  // --- Existing methods (unchanged) --------------------------------------

  registerDetection(): void {
    const id = this.paymentIntent?.paymentIntentId ?? (this.paymentIntent as any)?._id ?? '';
    if (!id) return;
    this.registeringDetection = true;
    this.invoiceService.registerDetection(id).subscribe({
      next: res => {
        this.toast.success('Payment intent registered for gateway detection');
        if (this.detection) {
          this.detection.status = res.data.status ?? 'ACTIVE';
          this.detection.gatewayIntentCode = res.data.gatewayIntentCode ?? '';
        } else {
          this.detection = res.data;
        }
        this.registeringDetection = false;
      },
      error: () => { this.registeringDetection = false; }
    });
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      PAID: 'success', PENDING_PAYMENT: 'warning', AWAITING_PAYMENT: 'warning',
      CONFIRMING: 'info', PAYMENT_DETECTED: 'info', UNDERPAID: 'error',
      OVERPAID: 'orange', EXPIRED: 'neutral', FAILED: 'error', CANCELLED: 'neutral', CREATED: 'neutral'
    };
    return map[status] ?? 'neutral';
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(() => this.toast.success('Copied!')).catch(() => {});
  }

  get fingerprintEnabled(): boolean {
    return this.paymentIntent?.amountFingerprint?.enabled === true;
  }

  get finalAmount(): number {
    return this.paymentIntent?.amountFingerprint?.finalExpectedAmount
      ?? this.paymentIntent?.expectedCryptoAmount ?? 0;
  }

  get fingerprint(): number {
    return this.paymentIntent?.amountFingerprint?.fingerprint ?? 0;
  }

  get expectedCryptoAmount(): number {
    return this.paymentIntent?.amountFingerprint?.finalExpectedAmount
      ?? this.paymentIntent?.expectedCryptoAmount ?? 0;
  }

  get expectedCryptoAsset(): string {
    return this.paymentIntent?.expectedCryptoAsset ?? '';
  }

  get expectedCryptoNetwork(): string {
    return this.paymentIntent?.expectedCryptoNetwork ?? '';
  }

  async downloadQr(): Promise<void> {
    if (!this.qrCodeUrl) return;
    this.downloadingQr = true;
    try {
      const response = await fetch(this.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-qr-${this.invoice?.invoiceNumber || 'invoice'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(this.qrCodeUrl, '_blank');
      this.toast.error('Could not auto-download — opened in a new tab instead');
    } finally {
      this.downloadingQr = false;
    }
  }

  async sharePaymentLink(): Promise<void> {
    if (!this.paymentUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${this.invoice?.invoiceNumber ?? ''}`,
          text: `Pay ${this.invoice?.currency} ${this.invoice?.amount} — ${this.invoice?.description ?? ''}`,
          url: this.paymentUrl
        });
      } catch {
        // user cancelled share — no-op
      }
    } else {
      this.copy(this.paymentUrl);
      this.toast.success('Link copied — share it however you like');
    }
  }
}
