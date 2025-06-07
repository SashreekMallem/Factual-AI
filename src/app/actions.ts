'use server';

import { extractClaims } from '@/ai/flows/extract-claims';
import { subClaimReasoning } from '@/ai/flows/sub-claim-reasoning';
import { analyzeTrustChain } from '@/ai/flows/trust-chain-analysis';
import type { ClaimVerificationResult, ClaimStatus } from '@/lib/types';
import { generateExplanation } from '@/ai/flows/ai-explanation';

// Helper to map subClaimReasoning verdict to ClaimStatus
const mapVerdictToStatus = (verdict: 'supported' | 'contradicted' | 'neutral'): ClaimStatus => {
  return verdict;
};

export async function verifyClaimsInText(text: string): Promise<ClaimVerificationResult[]> {
  if (!text.trim()) {
    return [];
  }

  try {
    const { claims: extractedClaimStrings } = await extractClaims({ text });

    if (!extractedClaimStrings || extractedClaimStrings.length === 0) {
      return [{
        id: 'no_claims_found',
        claimText: "No verifiable claims found in the provided text.",
        status: 'neutral',
        explanation: "The system could not identify any specific statements to verify. Please try rephrasing or providing more detailed text.",
        isProcessing: false,
        sources: []
      }];
    }
    
    const results: ClaimVerificationResult[] = await Promise.all(
      extractedClaimStrings.map(async (claimText, index) => {
        const claimId = `claim-${Date.now()}-${index}`;
        try {
          // 1. Sub-Claim Reasoning for primary verdict and explanation
          const subClaimResult = await subClaimReasoning({ claim: claimText, maxIterations: 2 });
          
          let finalStatus = mapVerdictToStatus(subClaimResult.overallVerdict);
          let finalExplanation = subClaimResult.reasoning;

          // 2. Trust Chain Analysis (on a mock representative source)
          // In a real system, this source would be dynamically retrieved based on the claim.
          const mockSourceUrl = `https://en.wikipedia.org/wiki/${claimText.substring(0,20).replace(/\s/g, '_')}`;
          const mockSourceContent = `Mock evidence related to: ${claimText}. This content is illustrative.`;
          
          let trustAnalysisData;
          try {
            const trustChainResponse = await analyzeTrustChain({
              sourceContent: mockSourceContent,
              sourceUrl: mockSourceUrl,
            });
            trustAnalysisData = {
              score: trustChainResponse.trustScore,
              reasoning: trustChainResponse.reasoning,
              sourceUrl: mockSourceUrl,
            };
          } catch (trustError) {
            console.warn(`Error in Trust Chain Analysis for claim "${claimText}":`, trustError);
            // Non-fatal, proceed without trust data
          }
          
          // 3. (Optional) AI Explanation if sub-claim reasoning is not detailed enough or to showcase
          // For this scaffold, subClaimResult.reasoning is typically sufficient.
          // If verdict is neutral and reasoning is sparse, we might call generateExplanation.
          if (finalStatus === 'neutral' && (!finalExplanation || finalExplanation.length < 50)) {
             try {
                const detailedExplanation = await generateExplanation({
                    claim: claimText,
                    evidence: "Based on available information and sub-claim analysis.",
                    verdict: subClaimResult.overallVerdict
                });
                finalExplanation = detailedExplanation.explanation;
             } catch (explanationError) {
                console.warn(`Error generating detailed explanation for claim "${claimText}":`, explanationError);
             }
          }

          return {
            id: claimId,
            claimText,
            status: finalStatus,
            explanation: finalExplanation || "No detailed explanation available.",
            trustAnalysis: trustAnalysisData,
            sources: [ // Mock sources for UI demonstration
              { id: 'src1', url: trustAnalysisData?.sourceUrl || '#', title: trustAnalysisData?.sourceUrl ? new URL(trustAnalysisData.sourceUrl).hostname : 'Primary Mock Source', trustScore: trustAnalysisData?.score, shortSummary: 'Retrieved from mock source.' },
              { id: 'src2', url: '#', title: 'Secondary Mock Source', trustScore: 0.65, shortSummary: 'Another supporting document.' },
            ],
            isProcessing: false,
          };
        } catch (error) {
          console.error(`Error processing claim "${claimText}":`, error);
          return {
            id: claimId,
            claimText,
            status: 'error',
            explanation: 'An error occurred during verification.',
            errorMessage: error instanceof Error ? error.message : String(error),
            isProcessing: false,
            sources: [],
          };
        }
      })
    );
    return results;
  } catch (error) {
    console.error('Error in verifyClaimsInText:', error);
    // Return a single error result if the whole process fails (e.g., claim extraction)
    return [{
      id: 'error-general',
      claimText: "Input Text Processing Error",
      status: 'error',
      explanation: "An error occurred while trying to process the input text.",
      errorMessage: error instanceof Error ? error.message : String(error),
      isProcessing: false,
      sources: []
    }];
  }
}
