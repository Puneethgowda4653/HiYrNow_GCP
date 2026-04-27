import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-share-modal',
  templateUrl: './share-modal.component.html',
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class ShareModalComponent {
  @Input() userProfileLink: string = '';
  @ViewChild('profileLinkInput') profileLinkInput!: ElementRef;
  
  isShareModalOpen: boolean = false;
  linkCopied: boolean = false;

  openShareModal(): void {
    this.isShareModalOpen = true;
  }

  closeShareModal(): void {
    this.isShareModalOpen = false;
    this.linkCopied = false;
  }

  copyProfileLink(): void {
    const linkInput = this.profileLinkInput.nativeElement;
    linkInput.select();
    
    try {
      navigator.clipboard.writeText(this.userProfileLink);
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  shareOnSocial(platform: 'whatsapp' | 'twitter' | 'linkedin'): void {
    const text = 'Check out this profile!';
    let shareUrl = '';

    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + this.userProfileLink)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.userProfileLink)}&text=${encodeURIComponent(text)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.userProfileLink)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }
}