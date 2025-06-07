
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
        let actualSources: MockSource[] = [];
        let trustAnalysisData: ClaimVerificationResult['trustAnalysis'] = undefined;
        let finalExplanation = "No detailed explanation could be generated.";
        let finalStatus: ClaimStatus = 'neutral';

        try {
          // 1. Sub-Claim Reasoning for primary verdict
          const subClaimResult = await subClaimReasoning({ claim: claimText, maxIterations: 2 });
          finalStatus = mapVerdictToStatus(subClaimResult.overallVerdict);
          // Initial explanation from sub-claim reasoning
          let explanationFromSubClaims = subClaimResult.reasoning || "Sub-claim analysis did not provide a detailed reasoning.";

          // 2. Trust Chain Analysis (using the claim text for search context via DuckDuckGo)
          let reasoningFromTrustAnalysis = "Trust analysis did not yield specific reasoning.";
          try {
            const trustChainResponse = await analyzeTrustChain({
              claimText: claimText,
            });
            
            trustAnalysisData = {
              score: trustChainResponse.trustScore,
              reasoning: trustChainResponse.reasoning,
            };
            reasoningFromTrustAnalysis = trustChainResponse.reasoning;

            if (trustChainResponse.analyzedSources && trustChainResponse.analyzedSources.length > 0) {
              actualSources = trustChainResponse.analyzedSources.map((src, idx) => ({
                id: `trust-src-${claimId}-${idx}`,
                url: src.link,
                title: src.title,
                shortSummary: src.snippet,
              }));
            } else {
                actualSources.push({
                    id: `fallback-src-${claimId}`,
                    url: '#',
                    title: 'No specific sources found by DuckDuckGo',
                    shortSummary: 'The live search did not return specific sources for this claim.',
                });
            }
          } catch (trustError) {
            console.warn(`Error in Trust Chain Analysis for claim "${claimText}":`, trustError);
            reasoningFromTrustAnalysis = "Could not perform detailed source analysis due to an error.";
            actualSources.push({ 
                id: `err-src-${claimId}`, 
                url: '#', 
                title: 'Trust Analysis Error', 
                shortSummary: 'Could not perform detailed source analysis.'
            });
            // Keep trustAnalysisData as undefined or with error markers if needed
            trustAnalysisData = {
              score: 0, // Default to 0 on error
              reasoning: "Error during trust analysis."
            };
          }
          
          // 3. Generate Final AI Explanation using combined evidence
          let evidenceForExplanation = `Sub-claim Analysis Verdict: ${subClaimResult.overallVerdict}.\nReasoning from sub-claims: ${explanationFromSubClaims}\n\n`;
          evidenceForExplanation += `Trust & Source Analysis Reasoning: ${reasoningFromTrustAnalysis}\n`;
          if (actualSources.length > 0 && actualSources[0].id !== `fallback-src-${claimId}` && actualSources[0].id !== `err-src-${claimId}`) {
              evidenceForExplanation += `Key sources considered: ${actualSources.map(s => s.title).slice(0,2).join('; ')}.`;
          } else {
              evidenceForExplanation += `No specific key sources were highlighted by the trust analysis.`;
          }

          try {
            const detailedExplanationResult = await generateExplanation({
                claim: claimText,
                evidence: evidenceForExplanation,
                verdict: subClaimResult.overallVerdict
            });
            finalExplanation = detailedExplanationResult.explanation;
          } catch (explanationError) {
             console.warn(`Error generating final AI explanation for claim "${claimText}":`, explanationError);
             finalExplanation = explanationFromSubClaims; // Fallback to sub-claim reasoning if final explanation fails
          }

          return {
            id: claimId,
            claimText,
            status: finalStatus,
            explanation: finalExplanation,
            trustAnalysis: trustAnalysisData,
            sources: actualSources,
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
