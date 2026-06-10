import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ReportsService } from '../core/services/reports.service';
import { ReportSummary } from '../core/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({ selector: 'app-reports', templateUrl: './reports.component.html' })
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('networkChart') networkChartRef!: ElementRef<HTMLCanvasElement>;

  summary: ReportSummary | null = null;
  loading = true;
  fromDate = '';
  toDate = '';
  statusChartInst: Chart | null = null;
  networkChartInst: Chart | null = null;

  constructor(private reportsSvc: ReportsService) {}

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
        setTimeout(() => this.buildCharts(), 120);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get invoiceStats(): { label: string; value: number }[] {
    if (!this.summary) return [];
    // Real API: summary.invoices is an array of invoice objects
    const total = Array.isArray(this.summary.invoices)
      ? this.summary.invoices.length
      : 0;
    const paid = Array.isArray(this.summary.invoices)
      ? this.summary.invoices.filter((i: any) => i.status === 'PAID').length
      : 0;
    const expired = Array.isArray(this.summary.invoices)
      ? this.summary.invoices.filter((i: any) => i.status === 'EXPIRED').length
      : 0;
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
  return this.summary.detections ??
    this.summary.usage.reduce((sum, u) => sum + u.count, 0);
}

get volumeEntries(): { currency: string; amount: number }[] {
  if (!this.summary?.volume) return [];
  return Object.entries(this.summary.volume)
    .map(([currency, amount]) => ({ currency, amount: amount as number }));
}

get paymentEntries(): { asset: string; amount: number }[] {
  if (!this.summary?.payments) return [];
  // Real API: payments is array, may be empty
  if (!Array.isArray(this.summary.payments)) {
    return Object.entries(this.summary.payments)
      .map(([asset, amount]) => ({ asset, amount: amount as number }));
  }
  return this.summary.payments.map((p: any) => ({
    asset: p.asset ?? p._id ?? 'UNKNOWN',
    amount: p.amount ?? p.total ?? 0
  }));
}

get webhookStats() {
  return { sent: this.summary?.webhooks?.sent ?? 0, failed: this.summary?.webhooks?.failed ?? 0 };
}

// Check if summary has any meaningful data
get hasData(): boolean {
  if (!this.summary) return false;
  return (this.summary.invoices?.length > 0) ||
         (this.summary.payments?.length > 0) ||
         (this.summary.usage?.length > 0);
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

    // Status doughnut
    if (this.statusChartRef) {
      if (this.statusChartInst) this.statusChartInst.destroy();
      const stats = Object.entries(this.summary.invoices);
      this.statusChartInst = new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: stats.map(([k]) => k.toUpperCase()),
          datasets: [
            {
              data: stats.map(([, v]) => v as number),
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

    // Volume bar
    if (this.networkChartRef) {
      if (this.networkChartInst) this.networkChartInst.destroy();
      const vols = Object.entries(this.summary.volume ?? {});
      this.networkChartInst = new Chart(this.networkChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: vols.map(([k]) => k),
          datasets: [
            {
              data: vols.map(([, v]) => v as number),
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
