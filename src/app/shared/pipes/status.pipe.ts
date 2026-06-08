import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'statusBadge' })
export class StatusPipe implements PipeTransform {
  transform(status: string): string {
    const map: Record<string, string> = {
      PAID: 'success', AWAITING_PAYMENT: 'warning', PENDING_PAYMENT: 'warning',
      CREATED: 'neutral', PAYMENT_DETECTED: 'info', CONFIRMING: 'info',
      UNDERPAID: 'error', OVERPAID: 'orange', EXPIRED: 'neutral',
      FAILED: 'error', CANCELLED: 'neutral',
      ACTIVE: 'success', DISABLED: 'neutral', RETIRED: 'neutral',
      SENT: 'success', PENDING: 'warning', RETRYING: 'info',
      COMPLETE: 'success', INCOMPLETE: 'warning'
    };
    return map[status] ?? 'neutral';
  }
}
