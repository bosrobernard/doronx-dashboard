import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ReportsService } from '../core/services/reports.service';
import { ReportSummary } from '../core/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({ selector: 'app-reports', templateUrl: './reports.component.html' })
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('statusChart')  statusChartRef!:  ElementRef<HTMLCanvasElement>;
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
    this.fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    this.toDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    this.load();
  }

  ngAfterViewInit(): void {}

  load(): void {
    this.loading = true;
    this.reportsSvc.getSummary(this.fromDate, this.toDate).subscribe({
      next: res => {
        this.summary = res.data;
        this.loading = false;
        setTimeout(() => this.buildCharts(), 120);
      },
      error: () => { this.loading = false; }
    });
  }

  get invoiceStats(): { label: string; value: number }[] {
    if (!this.summary) return [];
    return Object.entries(this.summary.invoices)
      .map(([label, value]) => ({ label: label.toUpperCase(), value: value as number }));
  }

  get volumeEntries(): { currency: string; amount: number }[] {
    if (!this.summary?.volume) return [];
    return Object.entries(this.summary.volume).map(([currency, amount]) => ({ currency, amount: amount as number }));
  }

  get paymentEntries(): { asset: string; amount: number }[] {
    if (!this.summary?.payments) return [];
    return Object.entries(this.summary.payments).map(([asset, amount]) => ({ asset, amount: amount as number }));
  }

  private buildCharts(): void {
    if (!this.summary) return;

    const colors = ['#22C55E','#F7931A','#3884FF','#A855F7','#EF4444','#94A3B8','#38BDF8'];

    // Status doughnut
    if (this.statusChartRef) {
      if (this.statusChartInst) this.statusChartInst.destroy();
      const stats = Object.entries(this.summary.invoices);
      this.statusChartInst = new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: stats.map(([k]) => k.toUpperCase()),
          datasets: [{ data: stats.map(([, v]) => v as number), backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
        },
        options: { cutout: '72%', plugins: { legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 11 }, boxWidth: 10 } } } }
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
          datasets: [{ data: vols.map(([, v]) => v as number), backgroundColor: '#F7931A', borderRadius: 6, borderSkipped: false }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#aaa' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } }
          }
        }
      });
    }
  }
}
