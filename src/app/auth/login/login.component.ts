import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-login', templateUrl: './login.component.html' })
export class LoginComponent {
  form: FormGroup;
  loading = false;
  showPass = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      environment: ['LIVE'],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.toast.success('Welcome back!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const message =
          err?.error?.message || 'Login failed. Please try again.';
        this.toast.error(message);
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  f(name: string) {
    return this.form.get(name)!;
  }
}
