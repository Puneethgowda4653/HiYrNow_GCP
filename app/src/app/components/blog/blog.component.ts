import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { Meta, Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '600ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('staggeredFadeIn', [
      transition(
        ':enter',
        [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate(
            '600ms {{delay}}ms ease-out',
            style({ opacity: 1, transform: 'translateY(0)' })
          ),
        ],
        { params: { delay: 0 } }
      ),
    ]),
  ],
})
export class BlogComponent implements OnInit {
  blogs: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private blogService: BlogService,
    private meta: Meta,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.loadBlogs();
    this.setMetaTags();
  }

  private setMetaTags(): void {
    this.titleService.setTitle('Blog Posts - Hiyrnow');

    this.meta.addTags([
      {
        name: 'description',
        content:
          'Explore our latest blog posts about job hunting, career advice, and industry insights.',
      },
      {
        name: 'keywords',
        content:
          'blog, career advice, job hunting, professional development, industry insights',
      },
      { property: 'og:title', content: 'Blog Posts - Hiyrnow' },
      {
        property: 'og:description',
        content:
          'Explore our latest blog posts about job hunting, career advice, and industry insights.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hiyrnow.in/blogs' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Blog Posts - Hiyrnow' },
      {
        name: 'twitter:description',
        content:
          'Explore our latest blog posts about job hunting, career advice, and industry insights.',
      },
    ]);
  }

  loadBlogs(): void {
    this.blogService.getAllBlogs().subscribe({
      next: (data) => {
        this.blogs = data;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load blogs';
        this.loading = false;
      },
    });
  }
}
