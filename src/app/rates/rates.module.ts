import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { RatesComponent } from './rates.component';

const routes: Routes = [{ path: '', component: RatesComponent }];

@NgModule({
  declarations: [RatesComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class RatesModule {}
