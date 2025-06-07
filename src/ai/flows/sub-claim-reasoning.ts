
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
  maxIterations: z.number().default(3).describe('The maximum number of recursive iterations.'),
});
export type SubClaimReasoningInput = z.infer<typeof SubClaimReasoningInputSchema>;

const SubClaimReasoningOutputSchema = z.object({
  overallVerdict: z.enum(['supported', 'contradicted', 'neutral']).describe('The overall verdict for the main claim based on sub-claim analysis.'),
  reasoning: z.string().describe('A detailed explanation of the reasoning process and verdicts for each sub-claim.'),
  verdictConfidence: z.number().min(0).max(1).describe('A score between 0.0 and 1.0 representing the confidence in the overallVerdict. 1.0 is highest confidence.'),
  nuanceDescription: z.string().optional().describe('An explanation of any ambiguities, context-dependencies, or reasons why the claim isn\'t straightforwardly true or false, or why the confidence is not 1.0.'),
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

  Your task is to analyze the given claim, identify key sub-claims, and recursively verify each sub-claim until a high-confidence verdict for the overall claim can be reached.

  Claim: {{{claim}}}

  Instructions:
  1. Identify 2-3 key sub-claims that must be verified to determine the truthfulness of the main claim.
  2. For each sub-claim, determine its verdict (supported, contradicted, or neutral) based on your knowledge and reasoning.
  3. Provide a detailed explanation of your reasoning process, including the verdicts for each sub-claim and how they contribute to the overall verdict for the main claim.
  4. Determine the 'overallVerdict' (supported, contradicted, or neutral) for the main claim.
  5. Assign a 'verdictConfidence' score (0.0 to 1.0) for your 'overallVerdict'. 1.0 means absolute certainty. Lower scores indicate less certainty.
  6. If the claim is not straightforward, or if confidence is less than 1.0, provide a 'nuanceDescription' explaining why. This could include ambiguity in the claim, conflicting evidence, context-dependency, or areas where evidence is lacking.

  Output MUST be a JSON object matching the defined schema.

  Example:
  Claim: The Earth is flat.

  Output:
  {
    "overallVerdict": "contradicted",
    "reasoning": "Sub-claim 1: The Earth appears flat to the naked eye. Verdict: Supported. Sub-claim 2: Scientific measurements confirm the Earth is a sphere. Verdict: Contradicted. While the Earth may appear flat from a limited perspective, overwhelming scientific evidence confirms its spherical shape. Therefore, the claim that the Earth is flat is contradicted.",
    "verdictConfidence": 0.95,
    "nuanceDescription": "Confidence is high (0.95) due to overwhelming scientific consensus. The 0.05 uncertainty acknowledges that a very small, fringe group might still dispute this, though without credible evidence."
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
    // For this iterative flow, we'll focus on a single comprehensive call for now,
    // as true recursive LLM calls within a single flow execution are complex.
    // The prompt itself asks for iterative reasoning within its response.
    const {output} = await subClaimReasoningPrompt({
      claim: input.claim,
      maxIterations: input.maxIterations, // Pass along, though the current prompt structure handles iteration internally
    });

    if (!output) {
        return {
            overallVerdict: 'neutral',
            reasoning: 'Could not perform sub-claim reasoning due to an LLM error.',
            verdictConfidence: 0.0,
            nuanceDescription: 'LLM failed to produce an output for sub-claim reasoning.'
        };
    }
    return output;
  }
);
