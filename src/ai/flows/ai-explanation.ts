
'use server';

/**
 * @fileOverview An AI agent that provides human-readable explanations for fact-checking verdicts
 * and attempts to provide corrected information for contradicted claims, potentially synthesizing
 * evidence from sub-claim verifications.
 *
 * - generateExplanation - A function that generates explanations and corrections.
 * - ExplanationInput - The input type for the generateExplanation function.
 * - ExplanationOutput - The return type for the generateExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplanationInputSchema = z.object({
  claim: z.string().describe('The original main claim to be explained.'),
  evidence: z.string().describe('The comprehensive evidence bundle used to support or refute the main claim. This bundle includes: initial reasoning for the main claim, quality assessment, trust analysis for the main claim, AND potentially detailed verification steps for any identified sub-claims (including their individual verdicts, reasoning, and source analyses).'),
  verdict: z.enum(['supported', 'contradicted', 'neutral']).describe('The initial verdict of the fact-check for the main claim (before considering sub-claim synthesis, though the evidence bundle contains sub-claim outcomes).'),
});
export type ExplanationInput = z.infer<typeof ExplanationInputSchema>;

const ExplanationOutputSchema = z.object({
  explanation: z.string().describe('A human-readable explanation of the verdict for the main claim, synthesizing all available evidence including sub-claim outcomes if present.'),
  correctedInformation: z.string().optional().describe('If the overall assessment (after considering all evidence including sub-claims) indicates the main claim is contradicted and the evidence strongly suggests a correction, this field provides the accurate information. Otherwise, it is omitted.'),
});
export type ExplanationOutput = z.infer<typeof ExplanationOutputSchema>;

export async function generateExplanation(input: ExplanationInput): Promise<ExplanationOutput> {
  return generateExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explanationPrompt',
  input: {schema: ExplanationInputSchema},
  output: {schema: ExplanationOutputSchema},
  prompt: `You are an expert fact-checker and clear communicator. Your primary task is to generate a comprehensive, human-readable explanation for the given 'claim', based on its 'verdict' and the extensive 'evidence' bundle provided.

Main Claim: {{{claim}}}
Initial Verdict for Main Claim: {{{verdict}}}

Comprehensive Evidence Bundle:
{{{evidence}}}

**Critical Instructions for Synthesizing Evidence:**
1.  **Holistic Review**: Carefully review the ENTIRE 'Comprehensive Evidence Bundle'. This bundle is structured and may contain several parts:
    *   Initial analysis and reasoning specifically for the 'Main Claim'.
    *   Quality assessment of the 'Main Claim'.
    *   Trust and source analysis related to the 'Main Claim'.
    *   **Crucially, it might also contain a section detailing the verification of 'Sub-Claims'. This section will include each sub-claim's text, its individual verdict, reasoning, confidence, and source analysis.**
2.  **Synthesize for Main Claim**: Your 'explanation' MUST be about the 'Main Claim'.
    *   If sub-claims were verified (check the evidence bundle), EXPLICITLY state how their outcomes (support, contradiction, neutrality) influence the understanding and final assessment of the 'Main Claim'.
    *   Your explanation should weave together findings from the main claim's direct analysis and any sub-claim analyses into a single, coherent narrative.
3.  **Correction for Contradicted Main Claim**:
    *   If, after synthesizing ALL evidence (including sub-claim outcomes), the 'Main Claim' is effectively contradicted:
        a.  Carefully review all parts of the 'Comprehensive Evidence Bundle'.
        b.  If the total evidence provides strong, clear support for what the correct information should be for the 'Main Claim', you MUST provide this in the 'correctedInformation' field. Be precise and concise.
        c.  If the total evidence is insufficient to confidently state the correct information for the 'Main Claim', omit the 'correctedInformation' field. Do not guess or speculate.
4.  **Final Verdict Implication**: While an 'Initial Verdict for Main Claim' is provided as input, your synthesized 'explanation' should clarify the *final* effective stance on the main claim, especially if sub-claim investigations have nuanced or altered the initial perspective.
5.  Ensure your output is a JSON object matching the defined schema.

Example for a contradicted claim with correction, considering sub-claim evidence:
Input:
{
  "claim": "The moon is made of green cheese and is actively mined by aliens.",
  "verdict": "neutral", // Initial verdict before sub-claim deep dive
  "evidence": "Initial reasoning for main claim: Highly speculative. Quality: Atomic but low check-worthiness for alien part. Trust for 'moon cheese': Low. \\n\\n [SUB-CLAIM VERIFICATION PHASE for main claim: \\"The moon is made of green cheese and is actively mined by aliens.\\"]\\n--- Verifying Sub-Claim: \\"The moon is made of green cheese\\" ---\\n  Verdict for Sub-Claim: contradicted (Confidence: 0.99)\\n  Reasoning: Scientific analysis indicates the moon is composed primarily of silicate rocks and minerals. No evidence of cheese has ever been found.\\n  Trust Analysis for Sub-Claim: Score 0.95. Sources: NASA lunar samples, geological surveys.\\n--- End Sub-Claim: \\"The moon is made of green cheese\\" ---\\n--- Verifying Sub-Claim: \\"The moon is actively mined by aliens\\" ---\\n  Verdict for Sub-Claim: contradicted (Confidence: 0.90)\\n  Reasoning: No credible evidence, satellite imagery, or official reports support active alien mining operations on the moon.\\n  Trust Analysis for Sub-Claim: Score 0.10. Sources: Primarily speculative websites, no scientific backing.\\n--- End Sub-Claim: \\"The moon is actively mined by aliens\\" ---\\n[END OF SUB-CLAIM VERIFICATION PHASE]"
}
Output:
{
  "explanation": "The claim that 'the moon is made of green cheese and is actively mined by aliens' is contradicted. Independent verification of its sub-components reveals strong evidence against both assertions. The sub-claim 'the moon is made of green cheese' is contradicted by extensive scientific analysis of lunar samples, which show a composition of silicate rocks. The sub-claim 'the moon is actively mined by aliens' is also contradicted due to a lack of any credible scientific evidence or official observations. Therefore, the main claim, relying on these contradicted components, is itself contradicted.",
  "correctedInformation": "The moon is primarily composed of silicate rocks and minerals, and there is no credible evidence of it being actively mined by aliens."
}
`,
});

const generateExplanationFlow = ai.defineFlow(
  {
    name: 'generateExplanationFlow',
    inputSchema: ExplanationInputSchema,
    outputSchema: ExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        return {
            explanation: "Could not generate an explanation due to an LLM error. The evidence bundle (including potential sub-claim analysis) could not be synthesized.",
        };
    }
    // The decision for correctedInformation is now fully up to the LLM based on synthesized evidence.
    // No need to check input.verdict here as the LLM should determine if the *overall* synthesized verdict is 'contradicted'.
    return output;
  }
);

