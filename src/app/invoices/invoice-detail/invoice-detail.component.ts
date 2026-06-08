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
  detection: any = null;
  timeline: any[] = [];
  loading = true;
  registeringDetection = false;

  constructor(
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.invoiceService.getById(id).subscribe({
      next: res => {
        const d = res.data;
        this.invoice = d.invoice;
        this.paymentIntent = d.paymentIntent;
        this.paymentUrl = d.paymentUrl ?? '';
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
}
