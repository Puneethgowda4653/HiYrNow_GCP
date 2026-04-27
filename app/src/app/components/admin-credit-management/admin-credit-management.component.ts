import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { CreditManagementService, CreditTransaction } from './credit.service';
import { CreditTransaction, UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr'; // Optional, for notifications

@Component({
  selector: 'app-admin-credit-management',
  template: `
    <div class="container">
      <h2>Credit Management</h2>
      
      <!-- User Search Section -->
      <div class="user-search mb-4">
        <input 
          type="text" 
          class="form-control" 
          [(ngModel)]="searchUsername" 
          placeholder="Search Username"
        >
        <button 
          class="btn btn-primary" 
          (click)="searchUser()"
        >
          Search User
        </button>
      </div>

      <!-- User Credit Info -->
      <div *ngIf="selectedUser" class="user-credit-info">
        <h3>User: {{ selectedUser.username }}</h3>
        <p>Current Balance: {{ userCredits }} credits</p>
      </div>

      <!-- Credit Management Form -->
      <form [formGroup]="creditForm" (ngSubmit)="manageCreditAction()">
        <div class="form-group">
          <label>Credit Amount</label>
          <input 
            type="number" 
            class="form-control" 
            formControlName="amount"
            placeholder="Enter credit amount"
          >
        </div>
        
        <div class="form-group">
          <label>Action</label>
          <select class="form-control" formControlName="action">
            <option value="add">Add Credits</option>
            <option value="remove">Remove Credits</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          class="btn btn-success" 
          [disabled]="!creditForm.valid || !selectedUser"
        >
          Submit
        </button>
      </form>

      <!-- Transaction History -->
      <div *ngIf="transactions.length" class="transaction-history mt-4">
        <h3>Recent Transactions</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Previous Balance</th>
              <th>New Balance</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let transaction of transactions">
              <td>{{ transaction.type }}</td>
              <td>{{ transaction.amount }}</td>
              <td>{{ transaction.previousBalance }}</td>
              <td>{{ transaction.newBalance }}</td>
              <td>{{ transaction.timestamp | date:'medium' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: auto; }
    .user-search { display: flex; gap: 10px; }
    .form-group { margin-bottom: 15px; }
  `]
})
export class AdminCreditManagementComponent implements OnInit {
  creditForm: FormGroup;
  searchUsername: string = '';
  selectedUser: any = null;
  userCredits: number = 0;
  transactions: CreditTransaction[] = [];

  constructor(
    private fb: FormBuilder,
    // private userService: CreditManagementService,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    this.creditForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      action: ['add', Validators.required]
    });
  }

  ngOnInit() {}

  searchUser() {
    if (!this.searchUsername) return;

    this.userService.findUserByUsername(this.searchUsername).subscribe(
      (user) => {
        this.selectedUser = user;
       let userid= user[0]._id
       console.log(userid);
console.log(userid);
        this.loadUserCredits(userid);
        this.loadUserTransactions(userid);
      },
      (error) => {
        this.toastr.error('User not found');
        this.resetUserData();
      }
    );
  }

  loadUserCredits(userId: string) {
    this.userService.getUserCreditBalance(userId).subscribe(
      (result) => {
        this.userCredits = result.points;
      }
    );
  }

  loadUserTransactions(userId: string) {
    this.userService.getUserCreditTransactions(userId).subscribe(
      (result) => {
        this.transactions = result.transactions;
      }
    );
  }

  manageCreditAction() {
    if (!this.selectedUser) return;

    const { amount, action } = this.creditForm.value;
    console.log("££££££££££££££££££££",this.selectedUser[0])
    const method = action === 'add' 
      ? this.userService.addCredits(this.selectedUser[0]._id, amount)
      : this.userService.removeCredits(this.selectedUser._id, amount);

    method.subscribe(
      (response) => {
        if (response.success) {
          this.toastr.success(response.message);
          this.userCredits = response.newBalance || this.userCredits;
          this.loadUserTransactions(this.selectedUser._id);
          this.creditForm.reset({ action: 'add' });
        } else {
          this.toastr.error(response.error || 'Operation failed');
        }
      },
      (error) => {
        this.toastr.error('An error occurred');
      }
    );
  }

  resetUserData() {
    this.selectedUser = null;
    this.userCredits = 0;
    this.transactions = [];
  }
}
