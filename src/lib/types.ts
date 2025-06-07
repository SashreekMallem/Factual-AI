export type ClaimStatus = 'supported' | 'contradicted' | 'neutral' | 'pending' | 'error';

export interface MockSource {
  id: string;
  url: string;
  title: string;
  trustScore?: number;
  shortSummary?: string;
}
export interface ClaimVerificationResult {
  id: string;
  claimText: string;
  status: ClaimStatus;
  explanation?: string; // Primary explanation from subClaimReasoning or generateExplanation
  trustAnalysis?: { // From Trust Chain Analysis on a representative source
    score?: number;
    reasoning?: string;
    sourceUrl?: string;
  };
  sources?: MockSource[]; // Mocked for UI demonstration
  isProcessing: boolean;
  errorMessage?: string;
}
