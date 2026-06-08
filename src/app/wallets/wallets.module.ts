import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { WalletsComponent } from './wallets.component';

const routes: Routes = [{ path: '', component: WalletsComponent }];

@NgModule({
  declarations: [WalletsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class WalletsModule {}
