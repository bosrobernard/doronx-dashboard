import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
    <app-confirm-modal></app-confirm-modal>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {}
