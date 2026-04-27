// credit-points.component.ts
import { Component, OnInit } from '@angular/core';
import { CreditPointsService } from '../../services/credit-points.service';
import { MatDialog } from '@angular/material/dialog';
import { PurchasePointsComponent } from '../purchase-points/purchase-points.component';
import { ToastrService } from 'ngx-toastr';
interface PointsInfo {
  type: string;
  details: string;
  points: number;
  capacity: string;
  icon: string;
}
@Component({
  selector: 'app-credit-points',
  templateUrl: './credit-points.component.html',
  styleUrls: ['./credit-points.component.css']
})
export class CreditPointsComponent implements OnInit {
  balance: number = 0;
  transactions: any[] = [];
  features: any = {};
  loading: boolean = false;
  displayedColumns: string[] = ['type', 'points', 'description', 'timestamp'];
  showPointsModal: boolean=false;
  pointsInfoList: PointsInfo[] = [
    {
      type: 'Applied User Profiles',
      details: 'Track and manage candidate applications with detailed profiles, status updates, and communication history.',
      points: 1,
      capacity: '16 profiles included',
      icon: '👥'
    },
    {
      type: 'Database User Access',
      details: 'Search, filter, and access our extensive database of pre-verified candidates with advanced search capabilities.',
      points: 1,
      capacity: '16 users included',
      icon: '🔍'
    },
    {
      type: 'PVC Verification',
      details: 'Comprehensive background checks including education, employment, and document validation.',
      points: 2,
      capacity: 'Per verification',
      icon: '✅'
    },
    {
      type: 'AI Skill Assessment',
      details: 'Customized skill evaluations using AI to assess technical, soft skills, and role-specific competencies.',
      points: 1,
      capacity: '5 assessment Submission',
      icon: '🤖'
    }
  ];

  constructor(
    private creditPointsService: CreditPointsService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  showPointsInfo(): void {
    this.showPointsModal = true;
  }
  loadData() {
    this.loading = true;
    Promise.all([
      this.creditPointsService.getBalance().toPromise(),
      this.creditPointsService.getTransactions().toPromise()
    ]).then(([balanceData, transactionData]) => {
      this.balance = balanceData.points;
      this.features = balanceData.features;
      this.transactions = transactionData.transactions;
      this.loading = false;
      this.toastr.success('Credit points data loaded successfully');
    }).catch(error => {
      this.loading = false;
      this.toastr.error('Failed to load credit points data');
      console.error('Error loading credit points data:', error);
    });
  }

  openPurchaseDialog() {
    const dialogRef = this.dialog.open(PurchasePointsComponent, {
      width: '500px',
      data: { currentBalance: this.balance }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
        this.toastr.success('Points purchased successfully');
      }
    });
  }



  closePointsInfo(): void {
    this.showPointsModal = false;
  }
}