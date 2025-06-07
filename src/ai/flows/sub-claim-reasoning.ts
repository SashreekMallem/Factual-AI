
'use server';

/**
 * @fileOverview An AI-powered sub-claim reasoning engine.
 *
 * - subClaimReasoning - A function that handles the sub-claim reasoning process.
 * - SubClaimReasoningInput - The input type for the subClaimReasoning function.
 * - SubClaimReasoningOutput - The return type for the subClaimReasoning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SubClaimReasoningInputSchema = z.object({
  claim: z.string().describe('The complex claim to be broken down and verified.'),
  maxIterations: z.number().default(3).describe('The maximum number of internal reasoning iterations the LLM should perform for this claim.'),
});
export type SubClaimReasoningInput = z.infer<typeof SubClaimReasoningInputSchema>;

const SubClaimReasoningOutputSchema = z.object({
  overallVerdict: z.enum(['supported', 'contradicted', 'neutral']).describe('The overall verdict for the main claim based on sub-claim analysis.'),
  reasoning: z.string().describe('A detailed explanation of the reasoning process and verdicts for each sub-claim identified and assessed internally by the LLM.'),
  verdictConfidence: z.number().min(0).max(1).describe('A score between 0.0 and 1.0 representing the confidence in the overallVerdict. 1.0 is highest confidence.'),
  nuanceDescription: z.string().optional().describe('An explanation of any ambiguities, context-dependencies, or reasons why the claim isn\'t straightforwardly true or false, or why the confidence is not 1.0.'),
  subClaimsForFurtherVerification: z.array(z.string()).optional().describe("If confidence in the 'overallVerdict' is low (e.g., below 0.8) and breaking down the claim further into specific, atomic sub-claims would help achieve a more definitive resolution, list 2-3 such sub-claims here. These sub-claims will be independently verified by the system. If confidence is high or further breakdown is not deemed helpful, this field can be omitted or an empty array."),
});
export type SubClaimReasoningOutput = z.infer<typeof SubClaimReasoningOutputSchema>;

export async function subClaimReasoning(input: SubClaimReasoningInput): Promise<SubClaimReasoningOutput> {
  return subClaimReasoningFlow(input);
}

const subClaimReasoningPrompt = ai.definePrompt({
  name: 'subClaimReasoningPrompt',
  input: {schema: SubClaimReasoningInputSchema},
  output: {schema: SubClaimReasoningOutputSchema},
  prompt: `You are an expert fact-checker specializing in verifying complex claims by breaking them down into smaller, verifiable sub-claims. You also assess the confidence in your verdict and describe any nuances.

  Your task is to analyze the given claim, identify key sub-claims (internally, for your own reasoning process up to 'maxIterations'), and determine a verdict for the main claim.

  Claim: {{{claim}}}
  Maximum internal reasoning iterations for this specific claim: {{{maxIterations}}}

  Instructions:
  1. Identify 2-3 key sub-claims that must be verified to determine the truthfulness of the main claim.
  2. For each sub-claim, determine its verdict (supported, contradicted, or neutral) based on your knowledge and reasoning.
  3. Provide a detailed 'reasoning' string explaining your internal process, including the verdicts for each sub-claim you considered and how they contribute to the 'overallVerdict' for the main claim.
  4. Determine the 'overallVerdict' (supported, contradicted, or neutral) for the main claim.
  5. Assign a 'verdictConfidence' score (0.0 to 1.0) for your 'overallVerdict'. 1.0 means absolute certainty.
  6. If the claim is not straightforward, or if confidence is less than 1.0, provide a 'nuanceDescription' explaining why.
  7. **Critical Step for Further System Action**: If your 'verdictConfidence' is less than 0.8 AND you believe that verifying specific, atomic sub-claims externally would significantly help in reaching a more definitive verdict for the main claim, then populate the 'subClaimsForFurtherVerification' array with 2-3 such sub-claims. These sub-claims should be phrased as clear, verifiable statements. If confidence is already high, or if further breakdown isn't beneficial, omit 'subClaimsForFurtherVerification' or provide an empty array.

  Output MUST be a JSON object matching the defined schema.

  Example (Low Confidence, Sub-Claims Identified for External Verification):
  Claim: "Advanced ancient civilizations, aided by extraterrestrials, built the pyramids and possessed unknown technologies like antigravity."
  Output:
  {
    "overallVerdict": "neutral",
    "reasoning": "The claim combines multiple complex assertions. Sub-claim 1: Pyramids were built by advanced ancient civilizations. Verdict: Supported (in terms of human ingenuity). Sub-claim 2: Extraterrestrials aided in pyramid construction. Verdict: Neutral (lacks credible evidence). Sub-claim 3: These civilizations possessed antigravity. Verdict: Neutral (no scientific evidence). The overall claim is complex and speculative, leading to a neutral stance with low confidence due to the unverified extraterrestrial and unknown technology aspects.",
    "verdictConfidence": 0.3,
    "nuanceDescription": "The claim involves multiple extraordinary assertions. While the human construction of pyramids is well-documented, the extraterrestrial and antigravity components lack verifiable evidence, making the overall claim highly speculative and not straightforwardly verifiable with current knowledge.",
    "subClaimsForFurtherVerification": [
      "There is credible archaeological evidence of extraterrestrial involvement in the construction of the Egyptian pyramids.",
      "There is documented proof that ancient civilizations possessed antigravity technology."
    ]
  }

  Example (High Confidence, No Further Sub-Claims Needed):
  Claim: "The Earth is flat."
  Output:
  {
    "overallVerdict": "contradicted",
    "reasoning": "Sub-claim 1: The Earth appears flat to an observer on the surface. Verdict: Supported (locally). Sub-claim 2: Overwhelming scientific evidence, including satellite imagery, circumnavigation, and physics, demonstrates the Earth is an oblate spheroid. Verdict: Supported. The local appearance is superseded by extensive scientific proof. Therefore, the claim 'The Earth is flat' is contradicted.",
    "verdictConfidence": 0.98,
    "nuanceDescription": "Confidence is very high due to overwhelming scientific consensus and empirical evidence. The 0.02 uncertainty acknowledges fringe beliefs but not credible scientific dispute."
    // "subClaimsForFurtherVerification" is omitted or empty
  }
`,
});

const subClaimReasoningFlow = ai.defineFlow(
  {
    name: 'subClaimReasoningFlow',
    inputSchema: SubClaimReasoningInputSchema,
    outputSchema: SubClaimReasoningOutputSchema,
  },
  async input => {
    const {output} = await subClaimReasoningPrompt({
      claim: input.claim,
      maxIterations: input.maxIterations,
    });

    if (!output) {
        return {
            overallVerdict: 'neutral',
            reasoning: 'Could not perform sub-claim reasoning due to an LLM error.',
            verdictConfidence: 0.0,
            nuanceDescription: 'LLM failed to produce an output for sub-claim reasoning.',
            subClaimsForFurtherVerification: []
        };
    }
    // Ensure subClaimsForFurtherVerification is an array if present, or default to empty
    output.subClaimsForFurtherVerification = output.subClaimsForFurtherVerification || [];
    return output;
  }
);

