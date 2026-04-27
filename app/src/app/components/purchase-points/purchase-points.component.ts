// purchase-points.component.ts
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CreditPointsService } from '../../services/credit-points.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-purchase-points',
  template: `
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-6">Purchase Points</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          *ngFor="let package of packages" 
          class="package-card cursor-pointer"
          [class.selected]="selectedPackage === package"
          (click)="selectPackage(package)">
          <div class="text-xl font-bold">₹{{package.amount | number}}</div>
          <div class="text-lg text-blue-600">{{package.points | number}} Points</div>
          <div class="text-sm text-gray-600">{{package.description}}</div>
        </div>
      </div>

      <div class="flex justify-end mt-6 gap-4">
        <button mat-button (click)="close()">Cancel</button>
        <button 
          mat-raised-button 
          color="primary" 
          [disabled]="!selectedPackage || loading"
          (click)="purchase()">
          {{loading ? 'Processing...' : 'Purchase'}}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .package-card {
      @apply p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all;
    }
    .package-card.selected {
      @apply border-blue-500 bg-blue-50;
    }
  `]
})
export class PurchasePointsComponent {
  // [disabled]="!selectedPackage || loading"
  // [disabled]="true"
  packages = [
    { 
      amount: 150000, 
      points: 750000,
      description: 'Best value for enterprise recruiters'
    },
    { 
      amount: 10000, 
      points: 10000,
      description: 'Perfect for growing teams'
    }
  ];
  selectedPackage: any = null;
  loading: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<PurchasePointsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private creditPointsService: CreditPointsService,
    private toastr: ToastrService
  ) {}

  selectPackage(pkg: any) {
    this.selectedPackage = pkg;
  }

  purchase() {
    if (!this.selectedPackage) {
      this.toastr.warning('Please select a package first');
      return;
    }
    
    this.loading = true;
    this.creditPointsService.purchasePoints(this.selectedPackage.amount)
      .subscribe(
        response => {
          this.toastr.success(`Successfully purchased ${this.selectedPackage.points} points`);
          this.dialogRef.close(true);
        },
        error => {
          console.error('Purchase failed:', error);
          this.toastr.error('Failed to purchase points. Please try again.');
          this.loading = false;
        }
      );
  }

  close() {
    this.dialogRef.close();
  }
}