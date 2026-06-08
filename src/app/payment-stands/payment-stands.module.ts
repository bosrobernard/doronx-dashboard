import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { PaymentStandsComponent } from './payment-stands.component';

const routes: Routes = [{ path: '', component: PaymentStandsComponent }];

@NgModule({
  declarations: [PaymentStandsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class PaymentStandsModule {}
