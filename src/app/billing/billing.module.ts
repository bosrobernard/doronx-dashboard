import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { BillingComponent } from './billing.component';

const routes: Routes = [{ path: '', component: BillingComponent }];

@NgModule({
  declarations: [BillingComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class BillingModule {}
