
export type ClaimStatus = 'supported' | 'contradicted' | 'neutral' | 'pending' | 'error';

export interface MockSource { // Renaming to "Source" for clarity as it can be real or mock
  id: string;
  url: string;
  title: string;
  trustScore?: number; // This might be an overall score or per source if available
  shortSummary?: string;
}

export interface ClaimVerificationResult {
  id:string;
  claimText: string;
  status: ClaimStatus;
  explanation?: string;
  trustAnalysis?: {
    score?: number; // Overall trust score for the claim based on analysis
    reasoning?: string;
    // We might not need a single sourceUrl here anymore if analysis uses multiple search results
  };
  sources?: MockSource[]; // Populated from (simulated) search results or other evidence
  isProcessing: boolean;
  errorMessage?: string;
}
