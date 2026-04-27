// company-profile.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface SocialMedia {
  icon: 'linkedin' | 'twitter' | 'instagram' | 'youtube';
  url: string;
}

interface TeamMember {
  name: string;
  position: string;
  avatar: string;
  bio: string;
  socialLinks: SocialMedia[];
}

interface JobFilter {
  label: string;
  value: string;
}

interface Job {
  title: string;
  type: string;
  department: string;
  location: string;
  postedDate: string;
  skills: string[];
}

interface Company {
  name: string;
  logo: string;
  banner: string;
  tagline: string;
  website: string;
  industry: string;
  founded: string;
  size: string;
  location: string;
  description: string;
  mission: string;
  vision: string;
  overallRating: number;
  totalReviews: number;
  socialMedia: SocialMedia[];
  address: string;
  phone: string;
  email: string;
}

interface Review {
  id: number;
  rating: number;
  title: string;
  position: string;
  comment: string;
  pros: string;
  cons: string;
  date: string;
}

interface GalleryItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  caption: string;
}

@Component({
  selector: 'app-company-profile',
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.css']
})
export class CompanyProfileComponent implements OnInit {
  scrollPosition = 0;
  isDarkMode = false;
  activeTab = 'about';
  mapUrl: SafeResourceUrl;
  currentGalleryIndex = 0;
  
  navigationTabs = [
    { id: 'about', label: 'About' },
    { id: 'jobs', label: 'Open Positions' },
    { id: 'team', label: 'Our Team' },
    { id: 'contact', label: 'Contact' }
  ];

  jobFilters: JobFilter[] = [
    { label: 'All', value: 'all' },
    { label: 'Engineering', value: 'engineering' },
    { label: 'Design', value: 'design' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Sales', value: 'sales' }
  ];

  selectedJobFilter = 'all';
  
  company: Company = {
    name: 'TechVision Innovations',
    logo: '/assets/images/techvision-logo.png',
    banner: '/assets/images/company-banner.jpg',
    tagline: 'Building the future of technology, one innovation at a time',
    website: 'https://techvision.io',
    industry: 'Software & Tech',
    founded: '2015',
    size: '500-1000 employees',
    location: 'San Francisco, CA (HQ) + Remote',
    description: `TechVision Innovations is a forward-thinking tech company specializing in AI-powered solutions that transform industries. We create intuitive software that helps businesses streamline operations and deliver exceptional customer experiences.`,
    mission: 'To empower organizations with intelligent technology that drives meaningful change and sustainable growth.',
    vision: 'A world where cutting-edge technology is accessible to all, creating opportunities and solving humanitys greatest challenges.',
    overallRating: 4.7,
    totalReviews: 328,
    socialMedia: [
      { icon: 'linkedin', url: 'https://linkedin.com/company/techvision' },
      { icon: 'twitter', url: 'https://twitter.com/techvision' },
      { icon: 'instagram', url: 'https://instagram.com/techvision' }
    ],
    address: '123 Tech Street, San Francisco, CA 94105',
    phone: '+1 (555) 123-4567',
    email: 'contact@techvision.io'
  };
  
  benefits = [
    { title: 'Remote-First Culture', description: 'Work from anywhere in the world with flexible hours', icon: 'globe' },
    { title: 'Unlimited PTO', description: 'Take the time you need to recharge and bring your best self to work', icon: 'calendar' },
    { title: 'Health & Wellness', description: 'Comprehensive health coverage and wellness stipend', icon: 'heart' },
    { title: 'Learning Budget', description: '$2,000 annual budget for courses, books, and conferences', icon: 'book' },
    { title: '401k Matching', description: 'We match 100% of contributions up to 4% of your salary', icon: 'trending-up' },
    { title: 'Equity Packages', description: 'Be an owner in the company youre helping build', icon: 'award' }
  ];
  
  teamMembers: TeamMember[] = [
    {
      name: 'John Doe',
      position: 'CEO & Founder',
      avatar: 'assets/images/team/john-doe.jpg',
      bio: 'Visionary leader with 15+ years of experience in technology.',
      socialLinks: [
        { icon: 'linkedin', url: 'https://linkedin.com/in/johndoe' },
        { icon: 'twitter', url: 'https://twitter.com/johndoe' }
      ]
    },
    // Add more team members as needed
  ];
  
  jobs: Job[] = [
    {
      title: 'Senior Software Engineer',
      type: 'Full-time',
      department: 'Engineering',
      location: 'San Francisco, CA',
      postedDate: '2 days ago',
      skills: ['JavaScript', 'Angular', 'Node.js']
    },
    // Add more jobs as needed
  ];
  
  reviews: Review[] = [
    {
      id: 1,
      rating: 5,
      title: 'Best workplace culture ever!',
      position: 'Software Engineer',
      comment: 'Ive been at TechVision for 2 years and the culture is amazing. Work-life balance is respected, and the projects are challenging in the best way.',
      pros: 'Great benefits, supportive management, interesting projects',
      cons: 'Fast-paced environment might not be for everyone',
      date: 'January 15, 2025'
    },
    {
      id: 2,
      rating: 4,
      title: 'Great place to grow professionally',
      position: 'Product Designer',
      comment: 'There are so many opportunities to learn and develop new skills. The company invests in employee growth.',
      pros: 'Learning opportunities, good compensation, flexible schedule',
      cons: 'Communication between departments could be improved',
      date: 'February 10, 2025'
    },
    {
      id: 3,
      rating: 5,
      title: 'Truly values diversity and inclusion',
      position: 'Marketing Specialist',
      comment: 'I appreciate how TechVision actively promotes diversity and creates an inclusive environment where everyone feels valued.',
      pros: 'Inclusive culture, meaningful work, great teammates',
      cons: 'Some projects have tight deadlines',
      date: 'December 5, 2024'
    }
  ];
  
  galleryItems: GalleryItem[] = [
    { id: 1, type: 'image', url: '/assets/images/office-space.jpg', caption: 'Our San Francisco HQ' },
    { id: 2, type: 'image', url: '/assets/images/team-event.jpg', caption: 'Annual team retreat 2024' },
    { id: 3, type: 'video', url: '/assets/videos/company-culture.mp4', caption: 'Life at TechVision' },
    { id: 4, type: 'image', url: '/assets/images/hackathon.jpg', caption: 'Quarterly Innovation Hackathon' },
    { id: 5, type: 'image', url: '/assets/images/office-dogs.jpg', caption: 'Our four-legged team members' }
  ];
  
  filteredJobs: Job[] = [];
  
  constructor(private sanitizer: DomSanitizer) {
    // Initialize map URL with a safe value
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.0973253597435!2d-122.4194!3d37.7749!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDQ2JzI5LjYiTiAxMjLCsDI1JzA5LjgiVw!5e0!3m2!1sen!2sus!4v1234567890'
    );
  }
  
  ngOnInit(): void {
    this.filteredJobs = this.jobs;
    // Check user's preferred color scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.toggleDarkMode();
    }
  }
  
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    this.scrollPosition = window.pageYOffset;
  }
  
  setActiveTab(tabId: string, event: Event): void {
    event.preventDefault();
    this.activeTab = tabId;
    const element = document.getElementById(tabId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  filterJobs(filter: string): void {
    this.selectedJobFilter = filter;
    
    if (filter === 'all') {
      this.filteredJobs = this.jobs;
      return;
    }
    
    this.filteredJobs = this.jobs.filter(job => {
      if (filter === 'remote' && job.location === 'Remote') return true;
      if (filter === 'fulltime' && job.type === 'Full-time') return true;
      if (filter === 'parttime' && job.type === 'Part-time') return true;
      return false;
    });
  }
  
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }
  
  prevGalleryItem(): void {
    this.currentGalleryIndex = this.currentGalleryIndex === 0 ? 
      this.galleryItems.length - 1 : this.currentGalleryIndex - 1;
  }
  
  nextGalleryItem(): void {
    this.currentGalleryIndex = (this.currentGalleryIndex + 1) % this.galleryItems.length;
  }
  
  setGalleryItem(index: number): void {
    this.currentGalleryIndex = index;
  }
}