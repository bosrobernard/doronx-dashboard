import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `<span class="badge" [ngClass]="'badge-' + type">{{ label }}</span>`
})
export class BadgeComponent {
  @Input() label = '';
  @Input() type = 'neutral';
}


