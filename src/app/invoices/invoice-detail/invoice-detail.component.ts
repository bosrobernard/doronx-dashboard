import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InvoiceService } from '../../core/services/invoice.service';
import { ToastService } from '../../core/services/toast.service';
import { Invoice, PaymentIntent } from '../../core/models';

@Component({ selector: 'app-invoice-detail', templateUrl: './invoice-detail.component.html' })
export class InvoiceDetailComponent implements OnInit {
  invoice: Invoice | null = null;
  paymentIntent: PaymentIntent | null = null;
  paymentUrl = '';
  qrCodeUrl = '';
  detection: any = null;
  timeline: any[] = [];
  loading = true;
  registeringDetection = false;
  downloadingQr = false;

  constructor(
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.invoiceService.getById(id).subscribe({
      next: res => {
        const d: any = res.data;
        this.invoice = d.invoice;
        this.paymentIntent = d.paymentIntent;

        // paymentUrl can come from a few different places depending on payload shape
        this.paymentUrl =
          d.invoice?.paymentUrl ??
          d.payment?.paymentUrl ??
          d.paymentUrl ??
          '';

        // QR code url similarly nested
        this.qrCodeUrl =
          d.payment?.qrCodeUrl ??
          d.invoice?.paymentQr?.qrCodeUrl ??
          d.paymentIntent?.paymentQr?.qrCodeUrl ??
          '';

        this.detection = d.detection ?? null;
        this.timeline = d.timeline ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

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

  // Download the QR code image (fetch as blob to bypass <a download> CORS quirks
  // with presigned S3/Contabo URLs)
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
      // Fallback: open in new tab so the user can save manually
      window.open(this.qrCodeUrl, '_blank');
      this.toast.error('Could not auto-download — opened in a new tab instead');
    } finally {
      this.downloadingQr = false;
    }
  }

  // Share the payment link (Web Share API where available, copy as fallback)
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
