import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AIJobGenerationRequest {
  jobTitle: string;
  company: string;
  location: string;
  jobType: string;
  minExp: number;
  maxExp: number;
  minSalary?: number;
  maxSalary?: number;
  minQualification: string;
  industry?: string;
  additionalContext?: string;
}

export interface AIJobGenerationResponse {
  minQualification: string;
  title: string;
  locationType: string;
  location: string;
  jobType: string;
  minExp: number;
  maxExp: number;
  minSalary?: number;
  maxSalary?: number;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: {
    name: string;
    mustHave: boolean;
    niceToHave: boolean;
  }[];
  benefits: string[];
  summary: string;
  customQuestions: {
    question: string;
    answerType: string;
    options: string[];
    required: boolean;
  }[];
}

export interface AIJobEnhancementRequest {
  currentDescription: string;
  jobTitle: string;
  company: string;
  enhancementType: 'improve' | 'expand' | 'simplify' | 'professional';
}

@Injectable({
  providedIn: 'root',
})
export class AIJobPostingService {
  baseUrl: string;
  constructor(private http: HttpClient) {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.baseUrl = base;
  }

  /**
   * Generate complete job description using AI
   */
  generateJobDescription(
    request: AIJobGenerationRequest
  ): Observable<AIJobGenerationResponse> {
    return this.http.post<AIJobGenerationResponse>(
      `${this.baseUrl}/api/jobPosting/ai/generate`,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Enhance existing job description
   */
  enhanceJobDescription(
    request: AIJobEnhancementRequest
  ): Observable<{ description: string }> {
    return this.http.post<{ description: string }>(
      `${this.baseUrl}/api/jobPosting/ai/enhance`,
      request,
      { withCredentials: true }
    );
  }

  /**
   * Generate skills based on job title and description
   */
  generateSkills(
    jobTitle: string,
    description: string
  ): Observable<{ skills: string[] }> {
    return this.http.post<{ skills: string[] }>(
      `${this.baseUrl}/api/jobPosting/ai/skills`,
      {
        jobTitle,
        description,
      },
      { withCredentials: true }
    );
  }

  /**
   * Generate job title suggestions based on company and context
   */
  generateJobTitles(
    company: string,
    context: string
  ): Observable<{ titles: string[] }> {
    return this.http.post<{ titles: string[] }>(
      `${this.baseUrl}/api/jobPosting/ai/titles`,
      {
        company,
        context,
      },
      { withCredentials: true }
    );
  }

  /**
   * Generate custom questions based on job title and description
   */
  generateCustomQuestions(
    jobTitle: string,
    description: string
  ): Observable<{ questions: any[] }> {
    return this.http.post<{ questions: any[] }>(
      `${this.baseUrl}/api/jobPosting/ai/custom-questions`,
      {
        jobTitle,
        description,
      },
      { withCredentials: true }
    );
  }

  /**
   * Analyze job posting for completeness and suggestions
   */
  analyzeJobPosting(jobData: any): Observable<{
    completeness: number;
    suggestions: string[];
    missingFields: string[];
  }> {
    return this.http.post<{
      completeness: number;
      suggestions: string[];
      missingFields: string[];
    }>(`${this.baseUrl}/api/jobPosting/ai/analyze`, jobData, {
      withCredentials: true,
    });
  }
}
