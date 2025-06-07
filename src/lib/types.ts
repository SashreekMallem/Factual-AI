

export type ClaimStatus = 'supported' | 'contradicted' | 'neutral' | 'pending' | 'error';

export interface MockSource { 
  id: string;
  url: string;
  title: string;
  trustScore?: number; 
  shortSummary?: string;
  type?: string; 
}

export interface ClaimQualityMetrics {
  atomicity: 'high' | 'medium' | 'low';
  fluency: 'good' | 'fair' | 'poor';
  decontextualization: 'high' | 'medium' | 'low';
  faithfulness: 'high' | 'medium' | 'low' | 'na';
  focus: 'specific' | 'neutral' | 'broad';
  checkworthiness: 'high' | 'medium' | 'low';
  overallAssessment: string;
}

export interface ClaimVerificationResult {
  id:string;
  claimText: string;
  status: ClaimStatus;
  explanation?: string;
  correctedInformation?: string; // Added to store corrected info if claim is contradicted
  trustAnalysis?: {
    score?: number; 
    reasoning?: string;
    generatedSearchQuery?: string;
  };
  sources?: MockSource[]; 
  isProcessing: boolean;
  errorMessage?: string;
  claimQualityMetrics?: ClaimQualityMetrics;
  verdictConfidence?: number;
  nuanceDescription?: string;
  originalTextContext?: string; 
}

// For the new loading animation
export type ProcessingStepStatus = 'pending' | 'in-progress' | 'completed' | 'error';
export interface DisplayedProcessingStep {
  id: string;
  text: string;
  status: ProcessingStepStatus;
  icon?: React.ElementType;
  details?: string; // Optional additional details for the step
}
