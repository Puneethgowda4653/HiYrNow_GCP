import { Component, Input, OnInit } from '@angular/core';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

@Component({
  selector: 'app-profile-preview-card',
  templateUrl: './profile-preview-card.component.html',
  styleUrls: ['./profile-preview-card.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerChildren', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(10px)' }),
          stagger(100, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class ProfilePreviewCardComponent implements OnInit {
  @Input() profileData: any = {};
  @Input() profileStrength: number = 0;

  constructor() {}

  ngOnInit(): void {
    // Animate profile strength on load
    setTimeout(() => {
      this.animateProfileStrength();
    }, 300);
  }

  animateProfileStrength(): void {
    // The animation is handled by CSS transitions
    // This is just a placeholder for any additional logic
  }

  getProfileStrengthColor(): string {
    if (this.profileStrength >= 80) {
      return '#00BFA6'; // Mint Green
    } else if (this.profileStrength >= 50) {
      return '#F9A826'; // Warm Gold
    } else {
      return '#6C63FF'; // Indigo Violet
    }
  }

  getProfileStrengthLabel(): string {
    if (this.profileStrength >= 80) {
      return 'Excellent';
    } else if (this.profileStrength >= 50) {
      return 'Good';
    } else if (this.profileStrength >= 30) {
      return 'Fair';
    } else {
      return 'Getting Started';
    }
  }

  getStarRating(): number {
    // Calculate star rating based on profile strength
    return Math.round((this.profileStrength / 100) * 5);
  }

  getFullName(): string {
    const personalDetails = this.profileData?.personalDetails || {};
    const firstName = personalDetails.firstName || '';
    const lastName = personalDetails.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Your Name';
  }

  getProfessionalSummary(): string {
    return (
      this.profileData?.personalDetails?.professionalSummary ||
      'Add a professional summary to make your profile stand out to recruiters.'
    );
  }

  getSkills(): any[] {
    return this.profileData?.skills || [];
  }

  getExperiences(): any[] {
    return this.profileData?.experience || [];
  }

  getEducation(): any[] {
    return this.profileData?.education || [];
  }

  getAvatarUrl(): string {
    return (
      this.profileData?.user?.profilePicture ||
      'https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small/default-avatar-profile-icon-of-social-media-user-vector.jpg'
    );
  }

  getLocation(): string {
    const personalDetails = this.profileData?.personalDetails || {};
    const city = personalDetails.currentCity || '';
    const state = personalDetails.currentState || '';
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    } else if (state) {
      return state;
    }
    return 'Location not specified';
  }

  getLinkedInUrl(): string {
    return this.profileData?.personalDetails?.linkedin || '';
  }

  getGithubUrl(): string {
    return this.profileData?.personalDetails?.github || '';
  }

  getPortfolioUrl(): string {
    return this.profileData?.personalDetails?.portfolio || '';
  }

  getProjects(): any[] {
    return this.profileData?.projects || [];
  }

  getProjectTechnologies(project: any): string[] {
    // Handle different possible technology field names and formats
    if (Array.isArray(project.technologies)) {
      return project.technologies;
    } else if (Array.isArray(project.techStack)) {
      return project.techStack;
    } else if (typeof project.technologies === 'string') {
      return project.technologies.split(',').map((t: string) => t.trim());
    } else if (typeof project.techStack === 'string') {
      return project.techStack.split(',').map((t: string) => t.trim());
    }
    return [];
  }

  getAchievements(): any[] {
    return this.profileData?.achievements || this.profileData?.awards || [];
  }

  formatAchievementDate(achievement: any): string {
    if (achievement.date) {
      // If it's a date object or string
      if (typeof achievement.date === 'string') {
        return achievement.date;
      } else if (achievement.date.year) {
        const month = achievement.date.month || '';
        return `${month} ${achievement.date.year}`.trim();
      }
    } else if (achievement.year) {
      return achievement.year.toString();
    }
    return '';
  }

  hasResume(): boolean {
    return !!(this.profileData?.user?.resumeUrl || this.profileData?.personalDetails?.resumeUrl);
  }

  getCertificates(): any[] {
    return this.profileData?.certificates || [];
  }

  getExtraCurricular(): any[] {
    return this.profileData?.extraCurricular || [];
  }

  getLanguages(): any[] {
    return this.profileData?.languages || [];
  }

  getEmail(): string {
    return this.profileData?.user?.email || this.profileData?.personalDetails?.email || '';
  }

  getPhone(): string {
    return this.profileData?.personalDetails?.mobileNumber || this.profileData?.personalDetails?.phone || '';
  }

  getDateOfBirth(): string {
    const dob = this.profileData?.personalDetails?.dateOfBirth;
    if (!dob) return '';
    if (typeof dob === 'string') return dob;
    if (dob.day && dob.month && dob.year) {
      return `${dob.day}/${dob.month}/${dob.year}`;
    }
    return '';
  }

  getGender(): string {
    return this.profileData?.personalDetails?.gender || '';
  }

  formatCertificateDate(cert: any): string {
    if (cert.issueDate) {
      if (typeof cert.issueDate === 'string') return cert.issueDate;
      if (cert.issueDate.month && cert.issueDate.year) {
        return `${cert.issueDate.month} ${cert.issueDate.year}`;
      }
      if (cert.issueDate.year) return cert.issueDate.year.toString();
    }
    return '';
  }

  hasContactInfo(): boolean {
    return !!(this.getEmail() || this.getPhone());
  }

  getProficiencyLevel(language: any): number {
    const proficiency = (language.proficiency || language.level || '').toLowerCase();
    
    // Map proficiency text to numeric level (1-5)
    if (proficiency.includes('native') || proficiency.includes('fluent')) return 5;
    if (proficiency.includes('advanced') || proficiency.includes('professional')) return 4;
    if (proficiency.includes('intermediate')) return 3;
    if (proficiency.includes('basic') || proficiency.includes('beginner')) return 2;
    if (proficiency.includes('elementary')) return 1;
    
    // If it's already a number
    const numericLevel = parseInt(proficiency);
    if (!isNaN(numericLevel) && numericLevel >= 1 && numericLevel <= 5) {
      return numericLevel;
    }
    
    return 3; // Default to intermediate if unknown
  }

  isExperienceOngoing(experience: any): boolean {
    // Check if experience is truly ongoing
    // It's ongoing only if ongoingStatus is explicitly true OR 
    // ongoingStatus is truthy AND there's no end date
    return experience.ongoingStatus === true || 
           (experience.ongoingStatus && !experience.endDate?.year);
  }
}

