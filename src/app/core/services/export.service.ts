import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { Invoice } from '../models';

export type ExportScope = 'current' | 'all';
export type ExportStructure = 'single' | 'summary-detail';

export interface ExportOptions {
  scope: ExportScope;
  structure: ExportStructure;
}

// Fill colors mirrored from the app's status badge palette so the
// exported sheet reads the same way the dashboard does.
const STATUS_COLORS: Record<string, string> = {
  PAID: 'FF22C55E',
  AWAITING_PAYMENT: 'FFF59E0B',
  PENDING_PAYMENT: 'FFF59E0B',
  CONFIRMING: 'FF3B82F6',
  PAYMENT_DETECTED: 'FF3B82F6',
  UNDERPAID: 'FFEF4444',
  OVERPAID: 'FFF97316',
  EXPIRED: 'FF94A3B8',
  FAILED: 'FFEF4444',
  CANCELLED: 'FF64748B',
  CREATED: 'FF94A3B8',
};

const HEADER_FILL = 'FF111827';
const HEADER_FONT = 'FFFFFFFF';

@Injectable({ providedIn: 'root' })
export class ExportService {
  /**
   * Builds and downloads an .xlsx workbook for the given invoices.
   * `structure` controls whether a single detail sheet is produced,
   * or a Summary sheet + Detail sheet pair.
   */
  async exportInvoices(
    invoices: Invoice[],
    options: ExportOptions,
    filenamePrefix = 'invoices',
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DoronX Smart Invoicing';
    workbook.created = new Date();

    if (options.structure === 'summary-detail') {
      this.buildSummarySheet(workbook, invoices);
    }
    this.buildDetailSheet(workbook, invoices, 'Invoices');

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const stamp = new Date().toISOString().slice(0, 10);
    this.downloadBlob(blob, `${filenamePrefix}-${options.scope}-${stamp}.xlsx`);
  }

  // ---------- sheet builders ----------

  private buildDetailSheet(
    workbook: ExcelJS.Workbook,
    invoices: Invoice[],
    name: string,
  ): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
      { header: 'Reference', key: 'referenceCode', width: 18 },
      { header: 'Payer', key: 'payerName', width: 22 },
      { header: 'Payer Email', key: 'payerEmail', width: 26 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Expected Crypto', key: 'expectedCrypto', width: 16 },
      { header: 'Asset', key: 'asset', width: 10 },
      { header: 'Network', key: 'network', width: 12 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Created', key: 'createdAt', width: 20 },
    ];

    invoices.forEach((inv: any) => {
      sheet.addRow({
        invoiceNumber: inv.invoiceNumber ?? '',
        referenceCode: inv.referenceCode ?? '',
        payerName: inv.payerName || inv.payer?.name || '',
        payerEmail: inv.payerEmail || inv.payer?.email || '',
        currency: inv.currency ?? '',
        amount: inv.amount ?? 0,
        expectedCrypto:
          inv.payment?.amountFingerprint?.finalExpectedAmount ??
          inv.payment?.expectedCryptoAmount ??
          0,
        asset: inv.payment?.expectedCryptoAsset ?? '',
        network: inv.payment?.expectedCryptoNetwork ?? '',
        status: inv.status ?? '',
        createdAt: inv.createdAt ? new Date(inv.createdAt) : '',
      });
    });

    this.styleHeaderRow(sheet);
    sheet.getColumn('amount').numFmt = '#,##0.00';
    sheet.getColumn('expectedCrypto').numFmt = '#,##0.000000';
    sheet.getColumn('createdAt').numFmt = 'yyyy-mm-dd hh:mm';
    this.colorStatusColumn(sheet, 'status');

    const lastCol = this.columnLetter(sheet.columns!.length);
    sheet.autoFilter = { from: 'A1', to: `${lastCol}1` };

    return sheet;
  }

  private buildSummarySheet(workbook: ExcelJS.Workbook, invoices: any[]): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 28 },
      { header: 'Value', key: 'value', width: 18 },
    ];

    const totalInvoices = invoices.length;
    const totalFiat = invoices.reduce((sum, i) => sum + (i.amount ?? 0), 0);
    const byStatus: Record<string, number> = {};
    invoices.forEach((i) => {
      byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
    });

    sheet.addRow({ metric: 'Total invoices', value: totalInvoices });
    sheet.addRow({ metric: 'Total fiat amount', value: totalFiat }).getCell('value').numFmt =
      '#,##0.00';
    sheet.addRow({});

    const breakdownHeader = sheet.addRow({ metric: 'By status', value: 'Count' });
    breakdownHeader.font = { bold: true };
    breakdownHeader.getCell('metric').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    breakdownHeader.getCell('value').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };

    Object.entries(byStatus).forEach(([status, count]) => {
      const row = sheet.addRow({ metric: status, value: count });
      const color = STATUS_COLORS[status] ?? 'FF94A3B8';
      row.getCell('metric').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      row.getCell('metric').font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    this.styleHeaderRow(sheet);
    return sheet;
  }

  // ---------- styling helpers ----------

  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const header = sheet.getRow(1);
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.font = { color: { argb: HEADER_FONT }, bold: true };
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } };
    });
    header.height = 22;
  }

  private colorStatusColumn(sheet: ExcelJS.Worksheet, key: string): void {
    const colNumber = sheet.getColumn(key).number;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell = row.getCell(colNumber);
      const color = STATUS_COLORS[String(cell.value)] ?? 'FF94A3B8';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });
  }

  private columnLetter(n: number): string {
    let s = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
