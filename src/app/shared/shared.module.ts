import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { BadgeComponent } from './components/badge/badge.component';
import { StatusPipe } from './pipes/status.pipe';
import { ShortNumberPipe } from './pipes/short-number.pipe';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';

@NgModule({
  declarations: [
    SidebarComponent, TopbarComponent, StatCardComponent,
    EmptyStateComponent, BadgeComponent,
    StatusPipe, ShortNumberPipe, ToastContainerComponent, ConfirmModalComponent
  ],
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  exports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DatePipe,
    SidebarComponent, TopbarComponent, StatCardComponent,
    EmptyStateComponent, BadgeComponent,
    StatusPipe, ShortNumberPipe, ToastContainerComponent,ConfirmModalComponent
  ],
  providers: [DatePipe]
})
export class SharedModule {}
