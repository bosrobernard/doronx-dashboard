import { Component } from '@angular/core';

@Component({ selector: 'app-webhooks', templateUrl: './webhooks.component.html' })
export class WebhooksComponent {
  events = [
    { type: 'invoice.paid', description: 'Fires when a payment is fully confirmed and amount is within tolerance' },
    { type: 'invoice.payment_detected', description: 'Fires when a transaction is first seen on-chain (0 confirmations)' },
    { type: 'invoice.confirming', description: 'Fires on each new confirmation block until threshold is reached' },
    { type: 'invoice.underpaid', description: 'Fires when confirmed amount is below expected minus tolerance' },
    { type: 'invoice.overpaid', description: 'Fires when confirmed amount exceeds the expected amount' },
  ];

  samplePayload = `{
  "id": "evt_abc123",
  "type": "invoice.paid",
  "createdAt": "2026-06-04T09:00:00.000Z",
  "data": {
    "invoiceId": "666000000000000000000301",
    "paymentIntentId": "666000000000000000000302",
    "referenceCode": "DRXREFABC123",
    "status": "PAID",
    "txHash": "0x88a25fec2fa44258...",
    "amount": 65.359477,
    "expectedAmount": 65.359477,
    "asset": "USDT",
    "network": "TRC20",
    "confirmations": 3
  }
}`;

  copied = false;

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }
}
