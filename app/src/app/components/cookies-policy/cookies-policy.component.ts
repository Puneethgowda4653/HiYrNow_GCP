import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cookies-policy',

  templateUrl: './cookies-policy.component.html',
  styleUrls: ['./cookies-policy.component.css'],
})
export class CookiesPolicyComponent implements OnInit {
  showBanner = true;
  cookiesAccepted = false;

  ngOnInit() {
    // Check if user has already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (cookiesAccepted === 'true') {
      this.showBanner = false;
      this.cookiesAccepted = true;
    }
  }

  acceptCookies() {
    this.cookiesAccepted = true;
    this.showBanner = false;
    localStorage.setItem('cookiesAccepted', 'true');
  }

  managePreferences() {
    // Implement cookie preferences management
    console.log('Managing cookie preferences');
  }
}
