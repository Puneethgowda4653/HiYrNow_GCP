import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PricingPlan } from '../../services/plan.service';
import { PaymentService } from '../../services/payment.service';
import { UserService } from 'src/app/services/user.service'; // Add this import
import { Router } from '@angular/router';

@Component({
  selector: 'app-subscribe-modal',
  templateUrl: './subscribe-modal.component.html',
  styleUrls: ['./subscribe-modal.component.css']
})
export class SubscribeModalComponent {
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  paymentMethod: 'upi' | 'dummy' = 'upi';
  upiId: string = '';
  isPaying = false;
  
  constructor(
    private dialogRef: MatDialogRef<SubscribeModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { plan: PricingPlan },
    private paymentService: PaymentService,
    private userService: UserService, // Inject AuthService
    private router: Router
  ) {}

  confirm() {
    this.dialogRef.close({ billingCycle: this.billingCycle });
  }

  close() {
    this.dialogRef.close();
  }

  async pay() {
    // if (this.paymentMethod === 'upi' && !this.upiId) {
    //   return;
    // }
  
    // // Get userId from UserService
    // try {
    //   const user = await this.userService.findLoggedUser();
    //   const userId = user?._id;
      
    //   if (!userId) {
    //     // Handle case where user is not logged in
    //     this.router.navigate(['/login']);
    //     return;
    //   }
  
    //   this.isPaying = true;
    //   this.paymentService
    //     .initiate({
    //       userId: userId,
    //       planId: this.data.plan._id as string,
    //       paymentMethod: this.paymentMethod,
    //       upiId: this.paymentMethod === 'upi' ? this.upiId : undefined,
    //     })
    //     .subscribe({
    //       next: (resp) => {
    //         const finalStatus = resp.status;
    //         this.paymentService.verify(resp.txnId, finalStatus).subscribe({
    //           next: (v) => {
    //             this.isPaying = false;
    //             this.dialogRef.close();
    //             if (v.status === 'success') {
    //               this.router.navigate(['/payment-success'], { queryParams: { planId: resp.planId } });
    //             } else {
    //               this.router.navigate(['/payment-failed']);
    //             }
    //           },
    //           error: () => {
    //             this.isPaying = false;
    //             this.dialogRef.close();
    //             this.router.navigate(['/payment-failed']);
    //           }
    //         });
    //       },
    //       error: () => {
    //         this.isPaying = false;
    //         this.dialogRef.close();
    //         this.router.navigate(['/payment-failed']);
    //       }
    //     });
    // } catch (error) {
    //   // Handle error fetching user
    //   this.router.navigate(['/login']);
    // }
  }
}