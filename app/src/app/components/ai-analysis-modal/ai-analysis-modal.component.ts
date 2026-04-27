import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface AIAnalysisResult {
  overallScore: number;
  confidence: number;
  strengths: string[];
  gaps: string[];
  assignments: {
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

@Component({
  selector: 'app-ai-analysis-modal',
  templateUrl: './ai-analysis-modal.component.html',
  styleUrls: ['./ai-analysis-modal.component.scss'],
})
export class AIAnalysisModalComponent {
  @Input() isOpen = false;
  @Input() isAnalyzing = false;
  @Input() analysisResults: AIAnalysisResult | null = null;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
