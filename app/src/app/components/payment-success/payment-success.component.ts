import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent {
  planId?: string;
  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.queryParams.subscribe(p => this.planId = p['planId']);
  }

  goToDashboard() {
    this.router.navigate(['/company/dashboard']);
  }
}


