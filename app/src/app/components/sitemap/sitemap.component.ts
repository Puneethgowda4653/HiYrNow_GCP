import { Component, OnInit } from '@angular/core';
import { SitemapService } from 'src/app/services/sitemap-service.service';

@Component({
  selector: 'app-sitemap',
  templateUrl: './sitemap.component.html',
  styleUrls: ['./sitemap.component.css']
})
export class SitemapComponent implements OnInit {
  sitemap: { loc: string; changefreq: string; priority: string }[] = [];

  constructor(private sitemapService: SitemapService) {}

  ngOnInit(): void {
    this.sitemapService.getSitemap().subscribe({
      next: (xmlData: string) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlData, 'application/xml');
        const urls = Array.from(xmlDoc.getElementsByTagName('url'));
        this.sitemap = urls.map((urlNode) => ({
          loc: urlNode.getElementsByTagName('loc')[0]?.textContent || '',
          changefreq: urlNode.getElementsByTagName('changefreq')[0]?.textContent || '',
          priority: urlNode.getElementsByTagName('priority')[0]?.textContent || '',
        }));
        console.log('Parsed Sitemap:', this.sitemap);
      },
      error: (err) => {
        console.error('Failed to fetch sitemap', err);
      }
    });
  }
}
