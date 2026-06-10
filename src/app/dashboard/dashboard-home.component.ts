import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InvoiceService } from '../core/services/invoice.service';
import { WorkspaceService } from '../core/services/workspace.service';
import { ReportsService } from '../core/services/reports.service';
import { AuthService } from '../core/services/auth.service';
import { Invoice, WorkspaceSetup, ReportSummary } from '../core/models';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent implements OnInit {
  invoices: Invoice[] = [];
  setup: WorkspaceSetup | null = null;
  summary: ReportSummary | null = null;
  loading = true;
  setupLoading = true;

  constructor(
    private invoiceService: InvoiceService,
    private workspaceService: WorkspaceService,
    private reportsService: ReportsService,
    public authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Load workspace setup checklist
    this.workspaceService.getSetup().subscribe({
      next: (res) => {
        this.setup = res.data;
        this.setupLoading = false;
      },
      error: () => {
        this.setupLoading = false;
      },
    });

    // Load recent invoices via search
    this.invoiceService.search({ limit: 8, page: 1 }).subscribe({
      next: (res) => {
        this.invoices = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    // Load summary for stats
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];
    this.reportsService.getSummary(from, to).subscribe({
      next: (res) => {
        this.summary = res.data;
      },
      error: () => {},
    });
  }

  get userName(): string {
    return (
      this.authService.auth?.user?.name ||
      this.authService.auth?.businessName ||
      'Merchant'
    );
  }
  get totalInvoices(): number {
    if (this.summary?.invoices && Array.isArray(this.summary.invoices)) {
      return this.summary.invoices.length;
    }
    return this.invoices.length;
  }

  get paidInvoices(): number {
    if (this.summary?.invoices && Array.isArray(this.summary.invoices)) {
      return this.summary.invoices.filter((i: any) => i.status === 'PAID')
        .length;
    }
    return this.invoices.filter((i) => i.status === 'PAID').length;
  }

  get detections(): number {
    if (!this.summary) return 0;
    // Real API puts detections in usage array, not a top-level field
    if (this.summary.usage?.length) {
      return this.summary.usage
        .filter((u) => u._id?.includes('DETECTION'))
        .reduce((sum, u) => sum + u.count, 0);
    }
    return this.summary.detections ?? 0;
  }

  get webhooksSent(): number {
    if (!this.summary) return 0;
    if (this.summary.usage?.length) {
      return this.summary.usage
        .filter((u) => u._id?.includes('WEBHOOK'))
        .reduce((sum, u) => sum + u.count, 0);
    }
    return this.summary.webhooks?.sent ?? 0;
  }

  get setupProgress(): number {
    return this.setup?.progress ?? 0;
  }
  get showSetupBanner(): boolean {
    return (
      this.setup?.status === 'INCOMPLETE' && (this.setup?.progress ?? 100) < 100
    );
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      PAID: 'success',
      AWAITING_PAYMENT: 'warning',
      PENDING_PAYMENT: 'warning',
      CONFIRMING: 'info',
      PAYMENT_DETECTED: 'info',
      UNDERPAID: 'error',
      OVERPAID: 'orange',
      EXPIRED: 'neutral',
      FAILED: 'error',
      CANCELLED: 'neutral',
      CREATED: 'neutral',
    };
    return map[status] ?? 'neutral';
  }

  getId(inv: Invoice): string {
    return inv.invoiceId ?? inv._id ?? '';
  }
}
