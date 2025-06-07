
'use server';

import { extractClaims } from '@/ai/flows/extract-claims';
import { subClaimReasoning } from '@/ai/flows/sub-claim-reasoning';
import { analyzeTrustChain } from '@/ai/flows/trust-chain-analysis';
import type { ClaimVerificationResult, ClaimStatus, MockSource } from '@/lib/types';
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
        let trustAnalysisData;
        let actualSources: MockSource[] = [];

        try {
          // 1. Sub-Claim Reasoning for primary verdict and explanation
          const subClaimResult = await subClaimReasoning({ claim: claimText, maxIterations: 2 });
          
          let finalStatus = mapVerdictToStatus(subClaimResult.overallVerdict);
          let finalExplanation = subClaimResult.reasoning;

          // 2. Trust Chain Analysis (using the claim text for search context)
          // The mockSourceUrl is illustrative of a potential starting point.
          const mockStartingSourceUrl = `https://en.wikipedia.org/wiki/${claimText.substring(0,20).replace(/\s/g, '_')}`;
          
          try {
            const trustChainResponse = await analyzeTrustChain({
              claimText: claimText,
              sourceUrl: mockStartingSourceUrl, // This can be used by the LLM as initial context if needed
            });
            trustAnalysisData = {
              score: trustChainResponse.trustScore,
              reasoning: trustChainResponse.reasoning,
              // sourceUrl is not directly comparable as it's now based on search
            };
            if (trustChainResponse.analyzedSources && trustChainResponse.analyzedSources.length > 0) {
              actualSources = trustChainResponse.analyzedSources.map((src, idx) => ({
                id: `trust-src-${claimId}-${idx}`,
                url: src.link,
                title: src.title,
                shortSummary: src.snippet,
                // trustScore per source is not provided by this flow, only an overall score.
              }));
            } else {
               // Fallback if no sources returned from analysis
                actualSources.push({
                    id: `fallback-src-${claimId}`,
                    url: '#',
                    title: 'General Information (from simulated search)',
                    shortSummary: 'Analysis based on simulated general search.',
                });
            }

          } catch (trustError) {
            console.warn(`Error in Trust Chain Analysis for claim "${claimText}":`, trustError);
            actualSources.push({ 
                id: `err-src-${claimId}`, 
                url: '#', 
                title: 'Trust Analysis Error', 
                shortSummary: 'Could not perform detailed source analysis.'
            });
          }
          
          // 3. (Optional) AI Explanation 
          if (finalStatus === 'neutral' && (!finalExplanation || finalExplanation.length < 50)) {
             try {
                const detailedExplanation = await generateExplanation({
                    claim: claimText,
                    evidence: trustAnalysisData?.reasoning || "Based on available information and sub-claim analysis.",
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
            trustAnalysis: trustAnalysisData, // Contains overall trust score and reasoning
            sources: actualSources, // Now populated from (simulated) search results
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
