import { Component, OnInit } from '@angular/core';
import { ReferralService, Referral, ReferralAnalytics } from '../../services/referral.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-referrals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-referrals.component.html',
  styleUrls: ['./admin-referrals.component.css']
})
export class AdminReferralsComponent implements OnInit {
  referrals: Referral[] = [];
  analytics: ReferralAnalytics | null = null;
  showCreateModal = false;
  showEditModal = false;
  selectedReferral: Referral | null = null;
  loading = false;
  error = '';
  success = '';

  // Form data for create/edit
  formData = {
    code: '',
    partnerName: '',
    email: '',
    offerType: 'freePlan' as 'freePlan' | 'discount' | 'customFeatures',
    offerDetails: {
      freePlan: 'growth' as string,
      durationDays: 30 as number,
      discountPercent: 0 as number,
      customFeatures: {} as any
    },
    maxUses: 100,
    isActive: true
  };

  constructor(private referralService: ReferralService) {}

  ngOnInit() {
    this.loadReferrals();
    this.loadAnalytics();
  }

  loadReferrals() {
    this.loading = true;
    this.referralService.getAllReferrals().subscribe({
      next: (referrals) => {
        this.referrals = referrals;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading referrals:', error);
        this.error = 'Failed to load referrals';
        this.loading = false;
      }
    });
  }

  loadAnalytics() {
    this.referralService.getReferralAnalytics().subscribe({
      next: (analytics) => {
        this.analytics = analytics;
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
      }
    });
  }

  openCreateModal() {
    this.resetForm();
    this.showCreateModal = true;
    this.showEditModal = false;
  }

  openEditModal(referral: Referral) {
    this.selectedReferral = referral;
    this.formData = {
      code: referral.code,
      partnerName: referral.partnerName,
      email: referral.email || '',
      offerType: referral.offerType,
      offerDetails: {
        freePlan: referral.offerDetails.freePlan || 'growth',
        durationDays: referral.offerDetails.durationDays || 30,
        discountPercent: referral.offerDetails.discountPercent || 0,
        customFeatures: referral.offerDetails.customFeatures || {}
      },
      maxUses: referral.maxUses,
      isActive: referral.isActive
    };
    this.showEditModal = true;
    this.showCreateModal = false;
  }

  closeModals() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.selectedReferral = null;
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      code: '',
      partnerName: '',
      email: '',
      offerType: 'freePlan' as 'freePlan' | 'discount' | 'customFeatures',
      offerDetails: {
        freePlan: 'growth' as string,
        durationDays: 30 as number,
        discountPercent: 0 as number,
        customFeatures: {} as any
      },
      maxUses: 100,
      isActive: true
    };
  }

  createReferral() {
    if (!this.formData.code || !this.formData.partnerName) {
      this.error = 'Code and Partner Name are required';
      return;
    }

    this.loading = true;
    this.referralService.createReferral(this.formData).subscribe({
      next: (response) => {
        this.success = 'Referral created successfully';
        this.loadReferrals();
        this.loadAnalytics();
        this.closeModals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating referral:', error);
        this.error = error.error?.error || 'Failed to create referral';
        this.loading = false;
      }
    });
  }

  updateReferral() {
    if (!this.selectedReferral?._id) return;

    this.loading = true;
    this.referralService.updateReferral(this.selectedReferral._id, this.formData).subscribe({
      next: (response) => {
        this.success = 'Referral updated successfully';
        this.loadReferrals();
        this.loadAnalytics();
        this.closeModals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating referral:', error);
        this.error = error.error?.error || 'Failed to update referral';
        this.loading = false;
      }
    });
  }

  deleteReferral(referral: Referral) {
    if (!referral._id) return;
    
    if (confirm(`Are you sure you want to delete referral code "${referral.code}"?`)) {
      this.loading = true;
      this.referralService.deleteReferral(referral._id).subscribe({
        next: (response) => {
          this.success = 'Referral deleted successfully';
          this.loadReferrals();
          this.loadAnalytics();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting referral:', error);
          this.error = error.error?.error || 'Failed to delete referral';
          this.loading = false;
        }
      });
    }
  }

  toggleReferralStatus(referral: Referral) {
    if (!referral._id) return;

    const updateData = { ...referral, isActive: !referral.isActive };
    this.referralService.updateReferral(referral._id, updateData).subscribe({
      next: (response) => {
        this.success = `Referral ${updateData.isActive ? 'activated' : 'deactivated'} successfully`;
        this.loadReferrals();
        this.loadAnalytics();
      },
      error: (error) => {
        console.error('Error updating referral status:', error);
        this.error = error.error?.error || 'Failed to update referral status';
      }
    });
  }

  clearMessages() {
    this.error = '';
    this.success = '';
  }

  getOfferTypeLabel(offerType: string): string {
    switch (offerType) {
      case 'freePlan': return 'Free Plan';
      case 'discount': return 'Discount';
      case 'customFeatures': return 'Custom Features';
      default: return offerType;
    }
  }

  getUtilizationRate(usageCount: number, maxUses: number): string {
    return ((usageCount / maxUses) * 100).toFixed(1);
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }
}
