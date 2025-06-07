

export type ClaimStatus = 'supported' | 'contradicted' | 'neutral' | 'pending' | 'error';

export interface MockSource { 
  id: string;
  url: string;
  title: string;
  trustScore?: number; 
  shortSummary?: string;
  type?: string; // Added from trust-chain-analysis.ts
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
