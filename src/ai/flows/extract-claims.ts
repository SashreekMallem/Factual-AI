
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
  claims: z.array(z.string()).describe('The extracted verifiable claims. Each claim should be atomic, decontextualized, and understandable independently.'),
});
export type ExtractClaimsOutput = z.infer<typeof ExtractClaimsOutputSchema>;

export async function extractClaims(input: ExtractClaimsInput): Promise<ExtractClaimsOutput> {
  return extractClaimsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractClaimsPrompt',
  input: {schema: ExtractClaimsInputSchema},
  output: {schema: ExtractClaimsOutputSchema},
  prompt: `You are an expert claim extractor. Your job is to extract verifiable factual claims from the given text.
Each extracted claim MUST be:
1.  **Atomic**: It should represent a single, indivisible factual statement.
2.  **Decontextualized**: It must be understandable on its own, without requiring the surrounding text.
3.  **Verifiable**: It should be a statement that can be checked for truthfulness against evidence.
4.  **Faithful**: It must accurately represent information stated or implied in the original text.

Do NOT extract opinions, questions, or non-factual statements.

Text:
{{{text}}}

Based on the criteria above, provide the extracted claims as an array of strings.
`,
  config: {
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
    if (!output || !output.claims) {
      return { claims: [] };
    }
    return output;
  }
);

