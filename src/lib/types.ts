
export type ClaimStatus = 'supported' | 'contradicted' | 'neutral' | 'pending' | 'error';

export interface MockSource { 
  id: string;
  url: string;
  title: string;
  trustScore?: number; 
  shortSummary?: string;
}

export interface ClaimVerificationResult {
  id:string;
  claimText: string;
  status: ClaimStatus;
  explanation?: string;
  trustAnalysis?: {
    score?: number; 
    reasoning?: string;
    generatedSearchQuery?: string; // Added to show which query was used
  };
  sources?: MockSource[]; 
  isProcessing: boolean;
  errorMessage?: string;
}
