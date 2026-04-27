import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AIJobPostingService,
  AIJobGenerationRequest,
  AIJobGenerationResponse,
} from '../../services/ai-job-posting.service';

@Component({
  selector: 'app-ai-job-generator',
  templateUrl: './ai-job-generator.component.html',
  styleUrls: ['./ai-job-generator.component.css'],
})
export class AIJobGeneratorComponent {
  @Input() companyName: string = '';
  @Output() jobGenerated = new EventEmitter<AIJobGenerationResponse>();
  @Output() skillsGenerated = new EventEmitter<string[]>();
  @Output() customQuestionsGenerated = new EventEmitter<any[]>();

  aiForm!: FormGroup;
  isGenerating = false;
  generatedJob: AIJobGenerationResponse | null = null;
  showAdvancedOptions = false;

  constructor(private fb: FormBuilder, private aiService: AIJobPostingService) {
    this.initForm();
  }

  initForm() {
    this.aiForm = this.fb.group({
      jobTitle: ['', Validators.required],
      location: ['', Validators.required],
      jobType: ['', Validators.required],
      minExp: [1, [Validators.required, Validators.min(0)]],
      maxExp: [3, [Validators.required, Validators.min(0)]],
      minQualification: ['', Validators.required],
      industry: ['Technology'],
      additionalContext: [''],
      minSalary: [null],
      maxSalary: [null],
    });
  }

  generateJobDescription() {
    if (this.aiForm.valid) {
      this.isGenerating = true;
      const request: AIJobGenerationRequest = {
        ...this.aiForm.value,
        company: this.companyName,
      };

      this.aiService.generateJobDescription(request).subscribe({
        next: (response) => {
          this.generatedJob = response;
          this.isGenerating = false;
          this.jobGenerated.emit(response);
        },
        error: (error) => {
          console.error('Error generating job description:', error);
          this.isGenerating = false;
          alert('Failed to generate job description. Please try again.');
        },
      });
    }
  }

  generateSkills() {
    const jobTitle = this.aiForm.get('jobTitle')?.value;
    const description = this.generatedJob?.description || '';

    if (jobTitle && description) {
      this.aiService.generateSkills(jobTitle, description).subscribe({
        next: (response) => {
          this.skillsGenerated.emit(response.skills);
        },
        error: (error) => {
          console.error('Error generating skills:', error);
          alert('Failed to generate skills. Please try again.');
        },
      });
    }
  }

  generateCustomQuestions() {
    const jobTitle = this.aiForm.get('jobTitle')?.value;
    const description = this.generatedJob?.description || '';

    if (jobTitle && description) {
      this.aiService.generateCustomQuestions(jobTitle, description).subscribe({
        next: (response) => {
          this.customQuestionsGenerated.emit(response.questions);
        },
        error: (error) => {
          console.error('Error generating custom questions:', error);
          alert('Failed to generate custom questions. Please try again.');
        },
      });
    }
  }

  useGeneratedJob() {
    if (this.generatedJob) {
      // Pass the generated job data directly since it now includes all form fields
      this.jobGenerated.emit(this.generatedJob);
    }
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  resetForm() {
    this.aiForm.reset({
      minExp: 1,
      maxExp: 3,
      industry: 'Technology',
    });
    this.generatedJob = null;
  }
}
