import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-register', templateUrl: './register.component.html' })
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  showPass = false;
  step = 1;

  currencies = ['GHS', 'USD', 'NGN', 'CAD', 'EUR'];
  timezones = ['Africa/Accra', 'Africa/Lagos', 'America/New_York', 'Europe/London', 'America/Toronto'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      businessName: ['', Validators.required],
      businessSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      environment: ['LIVE'],
      defaultCurrency: ['GHS', Validators.required],
      timezone: ['Africa/Accra', Validators.required],
      planCode: ['FREE']
    });

    this.form.get('businessName')?.valueChanges.subscribe(v => {
      const slug = (v ?? '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      this.form.get('businessSlug')?.setValue(slug, { emitEvent: false });
    });
  }

  next(): void {
    const step1 = ['name','email','phone','password'];
    step1.forEach(k => this.form.get(k)?.markAsTouched());
    const valid = step1.every(k => this.form.get(k)?.valid);
    if (valid) this.step = 2;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.auth.register(this.form.value).subscribe({
      next: () => { this.toast.success('Workspace created!'); this.router.navigate(['/dashboard']); },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });
  }

  f(name: string) { return this.form.get(name)!; }
}

