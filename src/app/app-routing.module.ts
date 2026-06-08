import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from './core/guards/auth.guard';
import { DashboardShellComponent } from './dashboard/dashboard-shell.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [GuestGuard],
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    component: DashboardShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard',      loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'onboarding',     loadChildren: () => import('./onboarding/onboarding.module').then(m => m.OnboardingModule) },
      { path: 'invoices',       loadChildren: () => import('./invoices/invoices.module').then(m => m.InvoicesModule) },
      { path: 'payment-stands', loadChildren: () => import('./payment-stands/payment-stands.module').then(m => m.PaymentStandsModule) },
      { path: 'wallets',        loadChildren: () => import('./wallets/wallets.module').then(m => m.WalletsModule) },
      { path: 'rates',          loadChildren: () => import('./rates/rates.module').then(m => m.RatesModule) },
      { path: 'webhooks',       loadChildren: () => import('./webhook-management/webhook-management.module').then(m => m.WebhookManagementModule) },
      { path: 'reports',        loadChildren: () => import('./reports/reports.module').then(m => m.ReportsModule) },
      { path: 'billing',        loadChildren: () => import('./billing/billing.module').then(m => m.BillingModule) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
