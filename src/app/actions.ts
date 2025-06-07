
'use server';

import { extractClaims } from '@/ai/flows/extract-claims';
import { subClaimReasoning } from '@/ai/flows/sub-claim-reasoning';
import { analyzeTrustChain } from '@/ai/flows/trust-chain-analysis';
import type { ClaimVerificationResult, ClaimStatus, MockSource, ClaimQualityMetrics } from '@/lib/types';
import { generateExplanation } from '@/ai/flows/ai-explanation';
import { evaluateClaimQuality } from '@/ai/flows/evaluate-claim-quality';

// Helper to map subClaimReasoning verdict to ClaimStatus
const mapVerdictToStatus = (verdict: 'supported' | 'contradicted' | 'neutral'): ClaimStatus => {
  return verdict;
};

/**
 * Placeholder for Smart Cache Check.
 * In a full implementation, this would query a vector database (e.g., Pinecone, Chroma)
 * for semantically similar, already verified claims.
 * @param claimText The claim text to check in the cache.
 * @returns A ClaimVerificationResult if a similar claim is found in cache, otherwise null.
 */
async function checkSmartCache(claimText: string): Promise<ClaimVerificationResult | null> {
  console.log(`Smart Cache Check (Conceptual): Checking cache for claim: "${claimText.substring(0, 50)}..."`);
  // STUB: In a real implementation, query a vector DB here.
  // const cachedResult = await vectorDB.findSimilar(claimText);
  // if (cachedResult && cachedResult.similarity > SOME_THRESHOLD) return cachedResult.data;
  return null; // Simulate cache miss for now
}


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
        sources: [],
        originalTextContext: text,
      }];
    }
    
    const results: ClaimVerificationResult[] = await Promise.all(
      extractedClaimStrings.map(async (claimText, index) => {
        const claimId = `claim-${Date.now()}-${index}`;

        // 1. Smart Cache Check (Conceptual)
        const cachedResult = await checkSmartCache(claimText);
        if (cachedResult) {
          console.log(`Smart Cache Hit for claim: "${claimText.substring(0,50)}..."`);
          return { ...cachedResult, id: claimId, isProcessing: false, originalTextContext: text };
        }
        console.log(`Smart Cache Miss for claim: "${claimText.substring(0,50)}..."`);

        // --- Tier Routing (Conceptual Placeholder) ---
        // Logic here would determine which verification pipeline to use.
        // For now, all claims go through the full default pipeline.
        console.log(`Tier Routing (Conceptual): Default pipeline for claim: "${claimText.substring(0,50)}..."`);
        // --- End Tier Routing Placeholder ---

        let actualSources: MockSource[] = [];
        let trustAnalysisData: ClaimVerificationResult['trustAnalysis'] = undefined;
        let finalExplanation = "No detailed explanation could be generated.";
        let finalStatus: ClaimStatus = 'neutral';
        let explanationFromSubClaims = "Sub-claim analysis was not conclusive or did not provide reasoning.";
        let reasoningFromTrustAnalysis = "Trust analysis did not yield specific reasoning.";
        let generatedQueryForTrustAnalysis: string | undefined = undefined;
        let claimQuality: ClaimQualityMetrics | undefined = undefined;
        let verdictConfidenceVal: number | undefined = undefined;
        let nuanceDesc: string | undefined = undefined;

        try {
          // Evaluate Claim Quality
          try {
            claimQuality = await evaluateClaimQuality({ claimText, originalText: text });
          } catch (qualityError) {
            console.warn(`Error evaluating claim quality for "${claimText}":`, qualityError);
            claimQuality = { // Fallback metrics
                atomicity: 'low', fluency: 'poor', decontextualization: 'low',
                faithfulness: 'na', focus: 'broad', checkworthiness: 'low',
                overallAssessment: 'Could not evaluate claim quality due to an error.'
            };
          }

          // Sub-Claim Reasoning for primary verdict, confidence, and nuance
          const subClaimResult = await subClaimReasoning({ claim: claimText, maxIterations: 2 });
          finalStatus = mapVerdictToStatus(subClaimResult.overallVerdict);
          explanationFromSubClaims = subClaimResult.reasoning || "Sub-claim analysis did not provide detailed reasoning.";
          verdictConfidenceVal = subClaimResult.verdictConfidence;
          nuanceDesc = subClaimResult.nuanceDescription;

          // Trust Chain Analysis (using the claim text for search context via DuckDuckGo)
          try {
            const trustChainResponse = await analyzeTrustChain({
              claimText: claimText,
            });
            
            trustAnalysisData = {
              score: trustChainResponse.trustScore,
              reasoning: trustChainResponse.reasoning,
              generatedSearchQuery: trustChainResponse.generatedSearchQuery,
            };
            reasoningFromTrustAnalysis = trustChainResponse.reasoning;
            generatedQueryForTrustAnalysis = trustChainResponse.generatedSearchQuery;

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
                    shortSummary: 'The live search (DuckDuckGo) did not return specific sources for this claim.',
                });
            }
          } catch (trustError) {
            console.warn(`Error in Trust Chain Analysis for claim "${claimText}":`, trustError);
            reasoningFromTrustAnalysis = "Could not perform detailed source analysis due to an error during trust chain analysis.";
            actualSources.push({ 
                id: `err-src-${claimId}`, 
                url: '#', 
                title: 'Trust Analysis Error', 
                shortSummary: 'Could not perform detailed source analysis due to an error.'
            });
            trustAnalysisData = {
              score: 0, 
              reasoning: "Error during trust analysis execution.",
              generatedSearchQuery: "Error in query generation/execution"
            };
          }
          
          // Generate Final AI Explanation using combined evidence
          let evidenceForExplanation = `Claim: "${claimText}"\n`;
          if (claimQuality) {
            evidenceForExplanation += `Claim Quality Assessment: ${claimQuality.overallAssessment}\n(Atomicity: ${claimQuality.atomicity}, Fluency: ${claimQuality.fluency}, Decontextualization: ${claimQuality.decontextualization}, Faithfulness: ${claimQuality.faithfulness}, Focus: ${claimQuality.focus}, Check-worthiness: ${claimQuality.checkworthiness})\n\n`;
          }
          evidenceForExplanation += `Verdict from Sub-Claim Analysis: ${subClaimResult.overallVerdict} (Confidence: ${verdictConfidenceVal?.toFixed(2) ?? 'N/A'}).\nReasoning from Sub-Claims: ${explanationFromSubClaims}\n`;
          if (nuanceDesc) {
            evidenceForExplanation += `Nuance/Ambiguity: ${nuanceDesc}\n`;
          }
          evidenceForExplanation += `\nVerdict from Trust & Source Analysis (Trust Score: ${trustAnalysisData?.score?.toFixed(2) ?? 'N/A'}):\nReasoning from Trust/Source Analysis: ${reasoningFromTrustAnalysis}\n`;
          if (generatedQueryForTrustAnalysis) {
            evidenceForExplanation += `Search Query Used for Trust Analysis: "${generatedQueryForTrustAnalysis}"\n`;
          }
          if (actualSources.length > 0 && actualSources[0].id !== `fallback-src-${claimId}` && actualSources[0].id !== `err-src-${claimId}`) {
              evidenceForExplanation += `Key Sources Considered (from DuckDuckGo): ${actualSources.map(s => s.title).slice(0,2).join('; ')}.`;
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
             finalExplanation = `Sub-Claim Reasoning: ${explanationFromSubClaims}\n\nTrust Analysis Reasoning: ${reasoningFromTrustAnalysis}`;
          }

          return {
            id: claimId,
            claimText,
            status: finalStatus,
            explanation: finalExplanation,
            trustAnalysis: trustAnalysisData,
            sources: actualSources,
            isProcessing: false,
            claimQualityMetrics: claimQuality,
            verdictConfidence: verdictConfidenceVal,
            nuanceDescription: nuanceDesc,
            originalTextContext: text,
          };
        } catch (error)
        {
          console.error(`Error processing claim "${claimText}":`, error);
          return {
            id: claimId,
            claimText,
            status: 'error',
            explanation: 'An error occurred during the main verification pipeline for this claim.',
            errorMessage: error instanceof Error ? error.message : String(error),
            isProcessing: false,
            sources: [],
            originalTextContext: text,
            claimQualityMetrics: claimQuality, // Include potentially partial quality metrics
          };
        }
      })
    );
    return results;
  } catch (error) {
    console.error('Error in verifyClaimsInText (top level):', error);
    return [{
      id: 'error-general',
      claimText: "Overall Input Text Processing Error",
      status: 'error',
      explanation: "An error occurred while trying to process the input text and extract claims.",
      errorMessage: error instanceof Error ? error.message : String(error),
      isProcessing: false,
      sources: [],
      originalTextContext: text,
    }];
  }
}
