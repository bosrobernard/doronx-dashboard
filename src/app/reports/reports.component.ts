import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReportsService } from '../core/services/reports.service';
import { ReportSummary } from '../core/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('networkChart') networkChartRef!: ElementRef<HTMLCanvasElement>;

  summary: ReportSummary | null = null;
  loading = true;
  fromDate = '';
  toDate = '';
  statusChartInst: Chart | null = null;
  networkChartInst: Chart | null = null;

  constructor(
    private reportsSvc: ReportsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Default: current month
    const now = new Date();
    this.fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    this.toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];
    this.load();
  }

  ngAfterViewInit(): void {}

  load(): void {
    this.loading = true;
    this.reportsSvc.getSummary(this.fromDate, this.toDate).subscribe({
      next: (res) => {
        this.summary = res.data;
        this.loading = false;
        this.cdr.markForCheck(); // ← add this
        setTimeout(() => this.buildCharts(), 120);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck(); // ← and this
      },
    });
  }

  get invoiceStats(): { label: string; value: number }[] {
    if (!this.summary) return [];
    const invoices: any[] = Array.isArray(this.summary.invoices)
      ? this.summary.invoices
      : [];

    // API returns aggregated: [{ _id: "EXPIRED", count: 1 }, { _id: "PAID", count: 3 }]
    const getCount = (status: string) =>
      invoices.find((i) => i._id === status)?.count ?? 0;

    const paid = getCount('PAID');
    const expired = getCount('EXPIRED');
    const total = invoices.reduce((sum, i) => sum + (i.count ?? 0), 0);

    return [
      { label: 'TOTAL', value: total },
      { label: 'PAID', value: paid },
      { label: 'EXPIRED', value: expired },
    ];
  }

  // Safe wrappers for template bindings
  get invoiceTotals() {
    const stats = this.invoiceStats;
    return {
      total: stats.find((s) => s.label === 'TOTAL')?.value ?? 0,
      paid: stats.find((s) => s.label === 'PAID')?.value ?? 0,
      expired: stats.find((s) => s.label === 'EXPIRED')?.value ?? 0,
    };
  }

  get detectionCount(): number {
    if (!this.summary?.usage) return 0;
    // Could be in usage array or legacy detections field
    return (
      this.summary.detections ??
      this.summary.usage.reduce((sum, u) => sum + u.count, 0)
    );
  }

  get volumeEntries(): { currency: string; amount: number }[] {
    if (!this.summary?.payments || !Array.isArray(this.summary.payments))
      return [];

    const map: Record<string, number> = {};
    for (const p of this.summary.payments) {
      const status = p._id?.status ?? '';
      if (status === 'EXPIRED') continue; // skip expired payments
      const asset = p._id?.asset ?? 'UNKNOWN';
      map[asset] = (map[asset] ?? 0) + (p.totalDetectedCrypto ?? 0); // use detected, not expected
    }

    // Filter out zero amounts
    return Object.entries(map)
      .filter(([, amount]) => amount > 0)
      .map(([currency, amount]) => ({ currency, amount }));
  }

  get paymentEntries(): { asset: string; amount: number }[] {
    if (!this.summary?.payments || !Array.isArray(this.summary.payments))
      return [];

    return this.summary.payments
      .filter((p: any) => {
        const status = p._id?.status ?? '';
        const detected = p.totalDetectedCrypto ?? 0;
        return status !== 'EXPIRED' && detected > 0; // only real received payments
      })
      .map((p: any) => {
        const idObj = p._id && typeof p._id === 'object' ? p._id : {};
        return {
          asset: `${idObj.asset ?? 'UNKNOWN'} (${idObj.network ?? ''})`,
          amount: p.totalDetectedCrypto ?? 0, // use detected, not expected
        };
      });
  }

  get webhookStats() {
    return {
      sent: this.summary?.webhooks?.sent ?? 0,
      failed: this.summary?.webhooks?.failed ?? 0,
    };
  }

  // Check if summary has any meaningful data
  get hasData(): boolean {
    if (!this.summary) return false;
    const hasInvoices = this.summary.invoices?.length > 0;
    const hasRealPayments = this.paymentEntries.length > 0;
    const hasUsage = this.summary.usage?.length > 0;
    return hasInvoices || hasRealPayments || hasUsage;
  }

  private buildCharts(): void {
    if (!this.summary) return;

    const colors = [
      '#22C55E',
      '#F7931A',
      '#3884FF',
      '#A855F7',
      '#EF4444',
      '#94A3B8',
      '#38BDF8',
    ];

    // ── Status doughnut ──────────────────────────────────────────
    if (this.statusChartRef) {
      if (this.statusChartInst) this.statusChartInst.destroy();

      // Use the same totals your template already uses — don't re-parse invoices
      const { total, paid, expired } = this.invoiceTotals;
      const pending = total - paid - expired;

      const labels = ['Paid', 'Expired', 'Pending'];
      const data = [paid, expired, pending];

      this.statusChartInst = new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: colors,
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#aaa', font: { size: 11 }, boxWidth: 10 },
            },
          },
        },
      });
    }

    // ── Volume bar ───────────────────────────────────────────────
    if (this.networkChartRef) {
      if (this.networkChartInst) this.networkChartInst.destroy();

      // Use the getter so the shape is already normalised
      const vols = this.volumeEntries;

      // Nothing to render — skip so Chart.js doesn't error on empty data
      if (vols.length === 0) return;

      this.networkChartInst = new Chart(this.networkChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: vols.map((v) => v.currency),
          datasets: [
            {
              data: vols.map((v) => v.amount),
              backgroundColor: '#F7931A',
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#aaa' } },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#aaa' },
            },
          },
        },
      });
    }
  }
}
