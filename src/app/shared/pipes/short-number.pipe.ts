import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'shortNum' })
export class ShortNumberPipe implements PipeTransform {
  transform(value: number): string {
    if (!value && value !== 0) return '—';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    return value.toFixed(2);
  }
}
