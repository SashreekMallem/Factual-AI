'use server';

/**
 * @fileOverview An AI agent that provides human-readable explanations for fact-checking verdicts.
 *
 * - generateExplanation - A function that generates explanations for verdicts.
 * - ExplanationInput - The input type for the generateExplanation function.
 * - ExplanationOutput - The return type for the generateExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplanationInputSchema = z.object({
  claim: z.string().describe('The claim to be explained.'),
  evidence: z.string().describe('The evidence used to support or refute the claim.'),
  verdict: z.enum(['supported', 'contradicted', 'neutral']).describe('The verdict of the fact-check.'),
});
export type ExplanationInput = z.infer<typeof ExplanationInputSchema>;

const ExplanationOutputSchema = z.object({
  explanation: z.string().describe('A human-readable explanation of the verdict.'),
});
export type ExplanationOutput = z.infer<typeof ExplanationOutputSchema>;

export async function generateExplanation(input: ExplanationInput): Promise<ExplanationOutput> {
  return generateExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explanationPrompt',
  input: {schema: ExplanationInputSchema},
  output: {schema: ExplanationOutputSchema},
  prompt: `You are an expert fact-checker. Given a claim, evidence, and a verdict, your task is to generate a human-readable explanation for the verdict.

Claim: {{{claim}}}
Evidence: {{{evidence}}}
Verdict: {{{verdict}}}

Explanation:`,
});

const generateExplanationFlow = ai.defineFlow(
  {
    name: 'generateExplanationFlow',
    inputSchema: ExplanationInputSchema,
    outputSchema: ExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
