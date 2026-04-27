import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { DomSanitizer, SafeHtml, Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.css']
})
export class BlogDetailComponent implements OnInit {
  blog: any;
  loading = true;
  sanitizedContent!: SafeHtml;

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private sanitizer: DomSanitizer,
    private meta: Meta,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.getBlogPost(id);
    });
  }

  getBlogPost(id: string) {
    this.blogService.getBlogById(id).subscribe({
      next: (data) => {
        this.blog = data;
        this.loading = false;
        if (this.blog?.content) {
          this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(this.blog.content);
          this.updateMetaTags();
        }
      },
      error: (error) => {
        console.error('Error fetching blog post:', error);
        this.loading = false;
      }
    });
  }

  private updateMetaTags(): void {
    if (!this.blog) return;
    this.titleService.setTitle(this.blog.title);
    this.meta.updateTag({ name: 'description', content: this.blog.description || this.blog.title });
    this.meta.updateTag({ property: 'og:title', content: this.blog.title });
    this.meta.updateTag({ property: 'og:description', content: this.blog.description || this.blog.title });
    if (this.blog.imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: this.blog.imageUrl });
    }
  }
}