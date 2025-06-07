'use server';

/**
 * @fileOverview Claim extraction AI agent.
 *
 * - extractClaims - A function that handles the claim extraction process.
 * - ExtractClaimsInput - The input type for the extractClaims function.
 * - ExtractClaimsOutput - The return type for the extractClaims function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractClaimsInputSchema = z.object({
  text: z.string().describe('The text from which to extract claims.'),
});
export type ExtractClaimsInput = z.infer<typeof ExtractClaimsInputSchema>;

const ExtractClaimsOutputSchema = z.object({
  claims: z.array(z.string()).describe('The extracted verifiable claims.'),
});
export type ExtractClaimsOutput = z.infer<typeof ExtractClaimsOutputSchema>;

export async function extractClaims(input: ExtractClaimsInput): Promise<ExtractClaimsOutput> {
  return extractClaimsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractClaimsPrompt',
  input: {schema: ExtractClaimsInputSchema},
  output: {schema: ExtractClaimsOutputSchema},
  prompt: `You are an expert claim extractor. Your job is to extract verifiable claims from the given text.

  Text: {{{text}}}

  Please provide the claims in an array of strings.
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const extractClaimsFlow = ai.defineFlow(
  {
    name: 'extractClaimsFlow',
    inputSchema: ExtractClaimsInputSchema,
    outputSchema: ExtractClaimsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
