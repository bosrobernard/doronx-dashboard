import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfirmModalService, ConfirmRequest } from '../../../core/services/confirm-modal.service';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss'
})
export class ConfirmModalComponent implements OnInit, OnDestroy {
  current: ConfirmRequest | null = null;
  private sub!: Subscription;

  constructor(private svc: ConfirmModalService) {}

  ngOnInit(): void {
    this.sub = this.svc.request$.subscribe((req) => {
      this.current = req;
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  confirm(): void {
    this.current?.resolve(true);
    this.current = null;
  }

  cancel(): void {
    this.current?.resolve(false);
    this.current = null;
  }
}
