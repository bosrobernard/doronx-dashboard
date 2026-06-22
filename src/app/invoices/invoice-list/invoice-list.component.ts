import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { ExportService, ExportScope, ExportStructure } from '../../core/services/export.service';
import { Invoice, InvoiceSearchParams } from '../../core/models';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-invoice-list',
  templateUrl: './invoice-list.component.html',
})
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  search = '';
  statusFilter = '';
  fromDate = '';
  toDate = '';
  page = 1;
  limit = 20;
  total = 0;
  hasMore = false;
  private search$ = new Subject<string>();

  // --- export menu state ---
  exportMenuOpen = false;
  exportLoading = false;
  exportScope: ExportScope = 'current';
  exportStructure: ExportStructure = 'single';

  statuses = [
    '',
    'PAID',
    'AWAITING_PAYMENT',
    'PENDING_PAYMENT',
    'PAYMENT_DETECTED',
    'CONFIRMING',
    'UNDERPAID',
    'OVERPAID',
    'EXPIRED',
    'FAILED',
    'CANCELLED',
  ];

  constructor(
    private invoiceService: InvoiceService,
    private exportService: ExportService,
    private elRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.page = 1;
        this.loadInvoices();
      });
  }

  // Close the export dropdown when clicking outside of it.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.exportMenuOpen && !this.elRef.nativeElement.contains(event.target)) {
      this.exportMenuOpen = false;
    }
  }

  loadInvoices(): void {
    this.loading = true;
    this.invoiceService.search(this.buildSearchParams(this.page, this.limit)).subscribe({
      next: (res) => {
        this.invoices = res.data ?? [];
        this.total = res.meta?.total ?? res.data?.length ?? 0;
        this.hasMore = res.meta?.hasMore ?? false;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    this.search$.next(this.search);
  }
  onFilterChange(): void {
    this.page = 1;
    this.loadInvoices();
  }

  onDateChange(): void {
    // Guard against an inverted range
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.toDate = this.fromDate;
    }
    this.page = 1;
    this.loadInvoices();
  }

  clearDateFilter(): void {
    this.fromDate = '';
    this.toDate = '';
    this.page = 1;
    this.loadInvoices();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadInvoices();
    }
  }
  nextPage(): void {
    if (this.hasMore) {
      this.page++;
      this.loadInvoices();
    }
  }

  // ---------- export ----------

  async onExport(scope: ExportScope, structure: ExportStructure): Promise<void> {
    this.exportLoading = true;
    try {
      const invoices = scope === 'current' ? this.invoices : await this.fetchAllInvoices();
      await this.exportService.exportInvoices(invoices, { scope, structure });
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      this.exportLoading = false;
      this.exportMenuOpen = false;
    }
  }

  // Pages through the search endpoint (respecting current filters) until
  // every matching invoice has been collected, capped for safety.
  private fetchAllInvoices(): Promise<Invoice[]> {
    const pageSize = 200;
    const maxPages = 25; // safety cap: ~5,000 invoices

    const collect = (page: number, acc: Invoice[]): Promise<Invoice[]> => {
      return new Promise((resolve, reject) => {
        this.invoiceService.search(this.buildSearchParams(page, pageSize)).subscribe({
          next: (res) => {
            const batch = res.data ?? [];
            const combined = acc.concat(batch);
            const more = res.meta?.hasMore ?? false;
            if (more && page < maxPages) {
              collect(page + 1, combined).then(resolve, reject);
            } else {
              resolve(combined);
            }
          },
          error: reject,
        });
      });
    };

    return collect(1, []);
  }

  private buildSearchParams(page: number, limit: number): InvoiceSearchParams {
    return {
      q: this.search || undefined,
      status: this.statusFilter || undefined,
      from: this.fromDate ? new Date(this.fromDate + 'T00:00:00.000Z').toISOString() : undefined,
      to: this.toDate ? new Date(this.toDate + 'T23:59:59.999Z').toISOString() : undefined,
      page,
      limit,
    };
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
      EXPIRED: 'expired',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      CREATED: 'neutral',
    };
    return map[status] ?? 'neutral';
  }

  getId(inv: Invoice): string {
    return inv.invoiceId ?? inv._id ?? '';
  }

  // Robust lookup for the expected crypto amount — different endpoints
  // nest this value in different places, so check every known location.
  getExpectedCrypto(inv: any): number {
    return (
      inv.payment?.amountFingerprint?.finalExpectedAmount ??
      inv.payment?.expectedCryptoAmount ??
      0
    );
  }

  getExpectedAsset(inv: any): string {
    return inv.payment?.expectedCryptoAsset ?? '';
  }

  getExpectedNetwork(inv: any): string {
    return inv.payment?.expectedCryptoNetwork ?? '';
  }
}
