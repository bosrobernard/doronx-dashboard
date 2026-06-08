import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat-card" [ngClass]="'accent-' + accent">
      <div class="stat-card-header">
        <span class="stat-card-label">{{ label }}</span>
        <div class="stat-card-icon">
          <ng-content select="[slot=icon]"></ng-content>
        </div>
      </div>
      <div class="stat-card-value">{{ value }}</div>
      <div class="stat-card-sub" *ngIf="sub">
        <span class="sub-change" [ngClass]="subPositive ? 'positive' : 'negative'">{{ sub }}</span>
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() sub = '';
  @Input() subPositive = true;
  @Input() accent = 'orange';
}
