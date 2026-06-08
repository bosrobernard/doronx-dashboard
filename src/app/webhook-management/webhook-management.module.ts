import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { WebhookManagementComponent } from './webhook-management.component';

const routes: Routes = [{ path: '', component: WebhookManagementComponent }];

@NgModule({
  declarations: [WebhookManagementComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class WebhookManagementModule {}
