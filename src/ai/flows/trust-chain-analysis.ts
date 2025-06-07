'use server';

/**
 * @fileOverview Analyzes the trust chain of evidence sources to understand information reliability.
 *
 * - analyzeTrustChain - Analyzes the trust chain of evidence sources.
 * - TrustChainAnalysisInput - Input for the trust chain analysis.
 * - TrustChainAnalysisOutput - Output of the trust chain analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrustChainAnalysisInputSchema = z.object({
  sourceContent: z
    .string()
    .describe('The content of the source to analyze for trust chain.'),
  sourceUrl: z.string().describe('URL of the source.'),
});
export type TrustChainAnalysisInput = z.infer<typeof TrustChainAnalysisInputSchema>;

const TrustChainAnalysisOutputSchema = z.object({
  trustScore: z.number().describe('A score representing the trustworthiness of the source.'),
  reasoning: z.string().describe('Explanation of how the trust score was determined.'),
});
export type TrustChainAnalysisOutput = z.infer<typeof TrustChainAnalysisOutputSchema>;

export async function analyzeTrustChain(input: TrustChainAnalysisInput): Promise<TrustChainAnalysisOutput> {
  return trustChainAnalysisFlow(input);
}

const trustChainAnalysisPrompt = ai.definePrompt({
  name: 'trustChainAnalysisPrompt',
  input: {schema: TrustChainAnalysisInputSchema},
  output: {schema: TrustChainAnalysisOutputSchema},
  prompt: `You are an expert in evaluating the trustworthiness of online sources.

  Analyze the following source content and URL to determine a trust score and provide reasoning.

  Source URL: {{{sourceUrl}}}
  Source Content: {{{sourceContent}}}

  Consider factors such as the source's reputation, transparency, editorial policy, and potential biases.

  Assign a trust score between 0 and 1, where 1 is the most trustworthy.
  Provide a brief explanation of your reasoning for the assigned score.
  Output MUST be a JSON object that looks like this:
  {
    "trustScore": 0.75,
    "reasoning": "The source is a well-established news organization with a clear editorial policy."
  }`,
});

const trustChainAnalysisFlow = ai.defineFlow(
  {
    name: 'trustChainAnalysisFlow',
    inputSchema: TrustChainAnalysisInputSchema,
    outputSchema: TrustChainAnalysisOutputSchema,
  },
  async input => {
    const {output} = await trustChainAnalysisPrompt(input);
    return output!;
  }
);
