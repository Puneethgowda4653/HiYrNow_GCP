// seo.service.ts
import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private meta: Meta,
    private title: Title,
    private router: Router
  ) {
    // Listen to route changes to update meta tags
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateMetaTagsForRoute(this.router.url);
    });
  }

  private updateMetaTagsForRoute(url: string) {
    // Define default meta tags
    let tags = this.getDefaultMetaTags();

    // Update meta tags based on route
    switch(url) {
      case '/about':
        tags = {
          title: 'About Us - Hiyrnow',
          description: 'Learn about Hiyrnow\'s mission to revolutionize hiring for startups in India',
          keywords: 'startup hiring, recruitment platform, hiring solution',
          ogTitle: 'About Hiyrnow - Revolutionizing Startup Hiring',
          ogDescription: 'Discover how Hiyrnow is transforming the hiring process for startups with AI-powered tools.',
          ogImage: 'https://hiyrnow.in/assets/about-og-image.png'
        };
        break;
      case '/jobs':
        tags = {
          title: 'Find Jobs - Hiyrnow',
          description: 'Browse through thousands of job opportunities at leading startups',
          keywords: 'startup jobs, tech jobs, india jobs',
          ogTitle: 'Find Your Dream Startup Job - Hiyrnow',
          ogDescription: 'Explore exciting career opportunities at innovative startups across India',
          ogImage: 'https://hiyrnow.in/assets/jobs-og-image.png'
        };
        break;
      // Add more routes as needed
    }

    this.updateMetaTags(tags);
  }

  private getDefaultMetaTags() {
    return {
      title: 'Hiyrnow - Your Trusted Job Portal',
      description: 'Hiyrnow - Your trusted job portal for job seekers and employers. Find your dream job or hire top talent with ease.',
      keywords: 'job portal, job search, recruitment, hiring, job seekers, employers, careers, employment',
      ogTitle: 'Hiyrnow - Your Path to Success',
      ogDescription: 'Find your dream job or hire top talent with Hiyrnow.',
      ogImage: 'https://hiyrnow.in/assets/hiyrnow_logo.png'
    };
  }

  private updateMetaTags(tags: any) {
    this.title.setTitle(tags.title);

    const metaTags = [
      { name: 'description', content: tags.description },
      { name: 'keywords', content: tags.keywords },
      { property: 'og:title', content: tags.ogTitle },
      { property: 'og:description', content: tags.ogDescription },
      { property: 'og:image', content: tags.ogImage },
      { property: 'og:url', content: `https://hiyrnow.in${this.router.url}` },
      { name: 'twitter:title', content: tags.ogTitle },
      { name: 'twitter:description', content: tags.ogDescription },
      { name: 'twitter:image', content: tags.ogImage }
    ];

    metaTags.forEach(tag => {
      if (tag.name) {
        this.meta.updateTag({ name: tag.name, content: tag.content });
      } else if (tag.property) {
        this.meta.updateTag({ property: tag.property, content: tag.content });
      }
    });
  }
}