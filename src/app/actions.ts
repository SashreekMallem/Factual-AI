
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
 */
async function checkSmartCache(claimText: string): Promise<ClaimVerificationResult | null> {
  console.log(`Smart Cache Check (Conceptual): Checking cache for claim: "${claimText.substring(0, 50)}..."`);
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async work
  return null; // Simulate cache miss for now
}


export async function verifyClaimsInText(text: string): Promise<ClaimVerificationResult[]> {
  if (!text.trim()) {
    return [];
  }

  try {
    // STAGE 1: Claim Extraction
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

        // STAGE 2: Smart Cache Check (Conceptual)
        const cachedResult = await checkSmartCache(claimText);
        if (cachedResult) {
          console.log(`Smart Cache Hit for claim: "${claimText.substring(0,50)}..."`);
          return { ...cachedResult, id: claimId, isProcessing: false, originalTextContext: text };
        }
        console.log(`Smart Cache Miss for claim: "${claimText.substring(0,50)}..."`);

        let actualSources: MockSource[] = [];
        let trustAnalysisData: ClaimVerificationResult['trustAnalysis'] = undefined;
        let finalExplanation = "No detailed explanation could be generated.";
        let correctedInformation: string | undefined = undefined;
        let finalStatus: ClaimStatus = 'neutral';
        let explanationFromInitialReasoning = "Initial claim reasoning was not conclusive or did not provide reasoning.";
        let reasoningFromTrustAnalysis = "Trust analysis did not yield specific reasoning.";
        let generatedQueryForTrustAnalysis: string | undefined = undefined;
        let claimQuality: ClaimQualityMetrics | undefined = undefined;
        let verdictConfidenceVal: number | undefined = undefined;
        let nuanceDesc: string | undefined = undefined;
        let evidenceForExplanation = `Original Claim: "${claimText}"\nOriginal Text (Context): "${text.substring(0, 200)}..."\n`;

        try {
          // STAGE 3: Evaluate Claim Quality
          try {
            claimQuality = await evaluateClaimQuality({ claimText, originalText: text });
            evidenceForExplanation += `\n[Claim Quality Assessment for Original Claim]: ${claimQuality.overallAssessment}\n(Atomicity: ${claimQuality.atomicity}, Fluency: ${claimQuality.fluency}, Decontextualization: ${claimQuality.decontextualization}, Faithfulness: ${claimQuality.faithfulness}, Focus: ${claimQuality.focus}, Check-worthiness: ${claimQuality.checkworthiness})\n`;
          } catch (qualityError) {
            console.warn(`Error evaluating claim quality for "${claimText}":`, qualityError);
            claimQuality = { 
                atomicity: 'low', fluency: 'poor', decontextualization: 'low',
                faithfulness: 'na', focus: 'broad', checkworthiness: 'low',
                overallAssessment: 'Could not evaluate claim quality due to an error.'
            };
            evidenceForExplanation += `\n[Claim Quality Assessment for Original Claim]: Error - ${claimQuality.overallAssessment}\n`;
          }

          // STAGE 4: Initial Sub-Claim Reasoning for primary verdict, confidence, and nuance
          const initialReasoningResult = await subClaimReasoning({ claim: claimText, maxIterations: 2 });
          finalStatus = mapVerdictToStatus(initialReasoningResult.overallVerdict);
          explanationFromInitialReasoning = initialReasoningResult.reasoning || "Sub-claim analysis did not provide detailed reasoning.";
          verdictConfidenceVal = initialReasoningResult.verdictConfidence;
          nuanceDesc = initialReasoningResult.nuanceDescription;
          const subClaimsIdentifiedForVerification = initialReasoningResult.subClaimsForFurtherVerification;

          evidenceForExplanation += `\n[Initial Reasoning for Original Claim "${claimText}"]:\nVerdict: ${initialReasoningResult.overallVerdict} (Confidence: ${verdictConfidenceVal?.toFixed(2) ?? 'N/A'}).\nReasoning: ${explanationFromInitialReasoning}\n`;
          if (nuanceDesc) {
            evidenceForExplanation += `Nuance/Ambiguity: ${nuanceDesc}\n`;
          }

          // STAGE 4.5: Recursive Sub-Claim Verification (if identified and confidence is low)
          const SUB_CLAIM_CONFIDENCE_THRESHOLD = 0.85;
          let subClaimProcessingEvidenceBundle = "";

          if (
            subClaimsIdentifiedForVerification &&
            subClaimsIdentifiedForVerification.length > 0 &&
            (verdictConfidenceVal === undefined || verdictConfidenceVal < SUB_CLAIM_CONFIDENCE_THRESHOLD)
          ) {
            subClaimProcessingEvidenceBundle += `\n\n[SUB-CLAIM VERIFICATION PHASE for original claim: "${claimText}"]\nSystem identified the following sub-claims for further detailed verification:\n`;
            for (const scText of subClaimsIdentifiedForVerification) {
              subClaimProcessingEvidenceBundle += `\n--- Verifying Sub-Claim: "${scText}" ---\n`;
              console.log(`Processing sub-claim: "${scText}" for main claim: "${claimText}"`);
              try {
                // A. Perform reasoning for the sub-claim
                const scReasoningResult = await subClaimReasoning({ claim: scText, maxIterations: 1 }); // Simplified pass for sub-claim
                subClaimProcessingEvidenceBundle += `  Verdict for Sub-Claim: ${scReasoningResult.overallVerdict} (Confidence: ${scReasoningResult.verdictConfidence.toFixed(2)})\n`;
                subClaimProcessingEvidenceBundle += `  Reasoning: ${scReasoningResult.reasoning}\n`;
                if (scReasoningResult.nuanceDescription) {
                  subClaimProcessingEvidenceBundle += `  Nuance: ${scReasoningResult.nuanceDescription}\n`;
                }

                // B. Perform trust analysis for the sub-claim
                const scTrustResult = await analyzeTrustChain({ claimText: scText });
                subClaimProcessingEvidenceBundle += `  Trust Analysis for Sub-Claim: Score ${scTrustResult.trustScore.toFixed(2)}\n`;
                subClaimProcessingEvidenceBundle += `  Search Query Used: "${scTrustResult.generatedSearchQuery || 'N/A'}"\n`;
                subClaimProcessingEvidenceBundle += `  Source Reasoning: ${scTrustResult.reasoning}\n`;
                if (scTrustResult.analyzedSources && scTrustResult.analyzedSources.length > 0) {
                   subClaimProcessingEvidenceBundle += `  Key Sources Found: ${scTrustResult.analyzedSources.map(s => `${s.title} (${s.type || 'Unknown'})`).slice(0,2).join('; ')}\n`;
                } else {
                   subClaimProcessingEvidenceBundle += `  Key Sources Found: No specific sources highlighted by search API for this sub-claim.\n`;
                }
              } catch (scError) {
                console.warn(`Error verifying sub-claim "${scText}":`, scError);
                subClaimProcessingEvidenceBundle += `  Error during verification of sub-claim "${scText}": ${scError instanceof Error ? scError.message : String(scError)}\n`;
              }
              subClaimProcessingEvidenceBundle += `--- End Sub-Claim: "${scText}" ---\n`;
            }
            subClaimProcessingEvidenceBundle += "[END OF SUB-CLAIM VERIFICATION PHASE]\n";
            evidenceForExplanation += subClaimProcessingEvidenceBundle; // Append to main evidence
          }


          // STAGE 5: Trust Chain Analysis for the original main claim
          try {
            const trustChainResponse = await analyzeTrustChain({ claimText: claimText });
            trustAnalysisData = {
              score: trustChainResponse.trustScore,
              reasoning: trustChainResponse.reasoning,
              generatedSearchQuery: trustChainResponse.generatedSearchQuery,
            };
            reasoningFromTrustAnalysis = trustChainResponse.reasoning;
            generatedQueryForTrustAnalysis = trustChainResponse.generatedSearchQuery;

            evidenceForExplanation += `\n[Trust & Source Analysis for Original Claim "${claimText}"]:\nTrust Score: ${trustAnalysisData?.score?.toFixed(2) ?? 'N/A'}\nReasoning: ${reasoningFromTrustAnalysis}\n`;
            if (generatedQueryForTrustAnalysis) {
              evidenceForExplanation += `Search Query Used: "${generatedQueryForTrustAnalysis}"\n`;
            }
            if (trustChainResponse.analyzedSources && trustChainResponse.analyzedSources.length > 0 && trustChainResponse.analyzedSources[0].type !== 'NoResult' && trustChainResponse.analyzedSources[0].type !== 'Error' && trustChainResponse.analyzedSources[0].type !== 'NoSpecificResults') {
                actualSources = trustChainResponse.analyzedSources.map((src, idx_s) => ({
                  id: `trust-src-${claimId}-${idx_s}`, url: src.link, title: src.title, shortSummary: src.snippet, type: src.type || 'Unknown',
                }));
                evidenceForExplanation += `Key Sources Considered (from Search API): ${actualSources.map(s => s.title).slice(0,2).join('; ')}\n`;
            } else {
                 evidenceForExplanation += `No specific key sources were highlighted by the trust analysis for the original claim.\n`;
                 actualSources.push({ id: `fallback-src-${claimId}`, url: '#', title: 'No specific sources found by Search API for main claim', shortSummary: 'The live search did not return specific sources for this claim.', type: 'NoResult'});
            }
          } catch (trustError) {
            console.warn(`Error in Trust Chain Analysis for claim "${claimText}":`, trustError);
            reasoningFromTrustAnalysis = "Could not perform detailed source analysis due to an error during trust chain analysis for the original claim.";
            evidenceForExplanation += `\n[Trust & Source Analysis for Original Claim "${claimText}"]:\nError - ${reasoningFromTrustAnalysis}\n`;
            actualSources.push({ id: `err-src-${claimId}`, url: '#', title: 'Trust Analysis Error for main claim', shortSummary: 'Could not perform detailed source analysis.', type: 'Error'});
            trustAnalysisData = { score: 0, reasoning: "Error during trust analysis execution for original claim.", generatedSearchQuery: "Error in query generation/execution"};
          }
          
          // STAGE 6: Generate Final AI Explanation & Correction using combined evidence (including sub-claim results)
          try {
            const detailedExplanationResult = await generateExplanation({
                claim: claimText, // The original claim is the subject of the final explanation
                evidence: evidenceForExplanation, // This now contains sub-claim verification details
                verdict: initialReasoningResult.overallVerdict // Initial verdict, LLM can refine in explanation
            });
            finalExplanation = detailedExplanationResult.explanation;
            // Corrected information logic is now primarily handled within generateExplanation based on the overall evidence
            if (detailedExplanationResult.correctedInformation) {
              correctedInformation = detailedExplanationResult.correctedInformation;
            }
          } catch (explanationError) {
             console.warn(`Error generating final AI explanation for claim "${claimText}":`, explanationError);
             finalExplanation = `Error in final explanation generation. Initial Reasoning: ${explanationFromInitialReasoning}\nTrust Analysis: ${reasoningFromTrustAnalysis}\nSub-Claim Details (if any): ${subClaimProcessingEvidenceBundle || "None"}`;
          }

          return {
            id: claimId,
            claimText,
            status: finalStatus, // This status is from the initial reasoning of the main claim. The explanation provides synthesis.
            explanation: finalExplanation,
            correctedInformation: correctedInformation,
            trustAnalysis: trustAnalysisData,
            sources: actualSources,
            isProcessing: false,
            claimQualityMetrics: claimQuality,
            verdictConfidence: verdictConfidenceVal, // Initial confidence for the main claim
            nuanceDescription: nuanceDesc, // Initial nuance for the main claim
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
            claimQualityMetrics: claimQuality, 
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

