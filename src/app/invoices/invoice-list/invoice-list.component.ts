import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { Invoice } from '../../core/models';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({ selector: 'app-invoice-list', templateUrl: './invoice-list.component.html' })
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  search = '';
  statusFilter = '';
  page = 1;
  limit = 20;
  total = 0;
  hasMore = false;
  private search$ = new Subject<string>();

  statuses = ['', 'PAID', 'AWAITING_PAYMENT', 'PAYMENT_DETECTED', 'CONFIRMING', 'UNDERPAID', 'OVERPAID', 'EXPIRED', 'FAILED'];

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.loadInvoices();
    });
  }

  loadInvoices(): void {
    this.loading = true;
    this.invoiceService.search({
      q: this.search || undefined,
      status: this.statusFilter || undefined,
      page: this.page,
      limit: this.limit
    }).subscribe({
      next: res => {
        this.invoices = res.data ?? [];
        this.total   = res.meta?.total ?? res.data?.length ?? 0;
        this.hasMore = res.meta?.hasMore ?? false;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearchChange(): void { this.search$.next(this.search); }
  onFilterChange(): void { this.page = 1; this.loadInvoices(); }

  prevPage(): void { if (this.page > 1) { this.page--; this.loadInvoices(); } }
  nextPage(): void { if (this.hasMore) { this.page++; this.loadInvoices(); } }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      PAID: 'success', AWAITING_PAYMENT: 'warning', PENDING_PAYMENT: 'warning',
      CONFIRMING: 'info', PAYMENT_DETECTED: 'info', UNDERPAID: 'error',
      OVERPAID: 'orange', EXPIRED: 'neutral', FAILED: 'error', CANCELLED: 'neutral', CREATED: 'neutral'
    };
    return map[status] ?? 'neutral';
  }

  getId(inv: Invoice): string { return inv.invoiceId ?? inv._id ?? ''; }
}
