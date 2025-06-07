// This is an AI-powered sub-claim reasoning engine.
//
// - subClaimReasoning - A function that handles the sub-claim reasoning process.
// - SubClaimReasoningInput - The input type for the subClaimReasoning function.
// - SubClaimReasoningOutput - The return type for the subClaimReasoning function.

'use server';

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
});
export type SubClaimReasoningOutput = z.infer<typeof SubClaimReasoningOutputSchema>;

export async function subClaimReasoning(input: SubClaimReasoningInput): Promise<SubClaimReasoningOutput> {
  return subClaimReasoningFlow(input);
}

const subClaimReasoningPrompt = ai.definePrompt({
  name: 'subClaimReasoningPrompt',
  input: {schema: SubClaimReasoningInputSchema},
  output: {schema: SubClaimReasoningOutputSchema},
  prompt: `You are an expert fact-checker specializing in verifying complex claims by breaking them down into smaller, verifiable sub-claims.

  Your task is to analyze the given claim, identify key sub-claims, and recursively verify each sub-claim until a high-confidence verdict for the overall claim can be reached.

  Claim: {{{claim}}}

  Instructions:
  1. Identify 2-3 key sub-claims that must be verified to determine the truthfulness of the main claim.
  2. For each sub-claim, determine its verdict (supported, contradicted, or neutral) based on your knowledge and reasoning.
  3. Provide a detailed explanation of your reasoning process, including the verdicts for each sub-claim and how they contribute to the overall verdict for the main claim.
  4. Ensure that the overallVerdict reflects the cumulative evidence from the sub-claims. If most sub-claims are supported, the overall verdict should be supported, and so on.

  Output Format:
  overallVerdict: (supported, contradicted, or neutral)
  reasoning: (Detailed explanation of the reasoning process and verdicts for each sub-claim)

  Example:
  Claim: The Earth is flat.

  Sub-claims:
  - Sub-claim 1: The Earth appears flat to the naked eye.
    Verdict: Supported
  - Sub-claim 2: Scientific measurements confirm the Earth is a sphere.
    Verdict: Contradicted

  overallVerdict: Contradicted
  reasoning: While the Earth may appear flat from a limited perspective, overwhelming scientific evidence confirms its spherical shape. Therefore, the claim that the Earth is flat is contradicted.
`,
});

const subClaimReasoningFlow = ai.defineFlow(
  {
    name: 'subClaimReasoningFlow',
    inputSchema: SubClaimReasoningInputSchema,
    outputSchema: SubClaimReasoningOutputSchema,
  },
  async input => {
    let currentClaim = input.claim;
    let iterationCount = 0;
    let overallVerdict: 'supported' | 'contradicted' | 'neutral' = 'neutral';
    let reasoning = '';

    while (iterationCount < input.maxIterations) {
      const {output} = await subClaimReasoningPrompt({
        claim: currentClaim,
        maxIterations: input.maxIterations,
      });

      overallVerdict = output!.overallVerdict;
      reasoning += `Iteration ${iterationCount + 1}:\n${output!.reasoning}\n\n`;

      // Basic exit condition: If a strong verdict is reached, exit the loop.
      if (overallVerdict !== 'neutral') {
        break;
      }

      iterationCount++;
    }

    return {overallVerdict, reasoning};
  }
);
