import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebhookManagementService } from '../core/services/webhook-management.service';
import { ToastService } from '../core/services/toast.service';
import { WebhookEndpoint, WebhookDelivery } from '../core/models';
import { environment } from '../../environments/environment';
import { ConfirmModalService } from '../core/services/confirm-modal.service';

const ALL_EVENTS = [
  'invoice.created',
  'invoice.payment_detected',
  'invoice.paid',
  'invoice.expired',
  'payment_intent.paid',
];

@Component({
  selector: 'app-webhook-management',
  templateUrl: './webhook-management.component.html',
})
export class WebhookManagementComponent implements OnInit {
  endpoints: WebhookEndpoint[] = [];
  deliveries: WebhookDelivery[] = [];
  loading = true;
  loadingDeliveries = true;
  showForm = false;
  saving = false;
  deletingId: string | null = null;
  newSecret: string | null = null;
  deliveryFilter = '';
  activeTab: 'endpoints' | 'deliveries' = 'endpoints';
  form: FormGroup;
  allEvents = ALL_EVENTS;

    disablingId: string | null = null;


  headersSample = `X-DoronPay-Event: invoice.paid
X-DoronPay-Timestamp: 1780000000
X-DoronPay-Signature: <hmac_sha256(secret, timestamp.rawBody)>
Content-Type: application/json`;

  nodeSample = `import crypto from "crypto";

function verifyWebhook(rawBody, timestamp, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp + "." + rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`;

  constructor(
    private svc: WebhookManagementService,
    private fb: FormBuilder,
    private toast: ToastService,
    private confirmModal: ConfirmModalService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      eventTypes: [
        ['invoice.paid', 'invoice.payment_detected'],
        Validators.required,
      ],
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadDeliveries();
  }

  load(): void {
    this.loading = true;
    this.svc.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.endpoints = res.data?.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.toast.error('Failed to load webhook endpoints');
        this.endpoints = [];
        this.loading = false;
      },
    });
  }

  loadDeliveries(): void {
    this.loadingDeliveries = true;
    this.svc.getDeliveries(this.deliveryFilter || undefined).subscribe({
      next: (res) => {
        this.deliveries = res.data?.items ?? [];
        this.loadingDeliveries = false;
      },
      error: () => {
        this.deliveries = [];
        this.loadingDeliveries = false;
      },
    });
  }

  toggleEvent(event: string): void {
    const curr: string[] = this.form.get('eventTypes')?.value ?? [];
    const next = curr.includes(event)
      ? curr.filter((e) => e !== event)
      : [...curr, event];
    this.form.get('eventTypes')?.setValue(next);
  }

  isEventSelected(event: string): boolean {
    return (this.form.get('eventTypes')?.value ?? []).includes(event);
  }


async disable(ep: WebhookEndpoint): Promise<void> {
  const confirmed = await this.confirmModal.confirm({
    title: 'Disable webhook',
    message: `Disable webhook "${ep.name}"? It will stop receiving events until re-enabled.`,
    confirmLabel: 'Disable',
    cancelLabel: 'Cancel',
  });
  if (!confirmed) return;

  const id = ep.endpointId;
  this.disablingId = id;
  this.svc.disable(id).subscribe({
    next: () => {
      this.toast.success('Webhook disabled');
      this.load();
      this.disablingId = null;
    },
    error: () => {
      this.disablingId = null;
    },
  });
}

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.newSecret = null;
    this.svc.create(this.form.value).subscribe({
      next: (res) => {
        this.toast.success('Webhook endpoint created!');
        if (res.data.secret) this.newSecret = res.data.secret;
        this.showForm = false;
        this.form.reset({
          eventTypes: ['invoice.paid', 'invoice.payment_detected'],
        });
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

  async delete(ep: WebhookEndpoint): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Delete webhook',
      message: `Delete webhook "${ep.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    const id = ep.endpointId;
    this.deletingId = id;
    this.svc.delete(id).subscribe({
      next: () => {
        this.toast.success('Webhook deleted');
        this.load();
        this.deletingId = null;
      },
      error: () => {
        this.deletingId = null;
      },
    });
  }

  copySecret(): void {
    if (this.newSecret) {
      navigator.clipboard.writeText(this.newSecret);
      this.toast.success('Secret copied!');
    }
  }

  dismissSecret(): void {
    this.newSecret = null;
  }

  deliveryBadge(status: string): string {
    const m: Record<string, string> = {
      SENT: 'success',
      PENDING: 'warning',
      RETRYING: 'info',
      FAILED: 'error',
      CANCELLED: 'neutral',
    };
    return m[status] ?? 'neutral';
  }

  f(n: string) {
    return this.form.get(n)!;
  }
}
