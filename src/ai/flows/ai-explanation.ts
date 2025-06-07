'use server';

/**
 * @fileOverview An AI agent that provides human-readable explanations for fact-checking verdicts
 * and attempts to provide corrected information for contradicted claims.
 *
 * - generateExplanation - A function that generates explanations and corrections.
 * - ExplanationInput - The input type for the generateExplanation function.
 * - ExplanationOutput - The return type for the generateExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplanationInputSchema = z.object({
  claim: z.string().describe('The claim to be explained.'),
  evidence: z.string().describe('The comprehensive evidence used to support or refute the claim. This includes sub-claim analysis, trust analysis, source details, and quality metrics.'),
  verdict: z.enum(['supported', 'contradicted', 'neutral']).describe('The verdict of the fact-check.'),
});
export type ExplanationInput = z.infer<typeof ExplanationInputSchema>;

const ExplanationOutputSchema = z.object({
  explanation: z.string().describe('A human-readable explanation of the verdict, synthesizing all available evidence.'),
  correctedInformation: z.string().optional().describe('If the verdict is "contradicted" and the evidence strongly suggests a correction, this field provides the accurate information. Otherwise, it is omitted.'),
});
export type ExplanationOutput = z.infer<typeof ExplanationOutputSchema>;

export async function generateExplanation(input: ExplanationInput): Promise<ExplanationOutput> {
  return generateExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explanationPrompt',
  input: {schema: ExplanationInputSchema},
  output: {schema: ExplanationOutputSchema},
  prompt: `You are an expert fact-checker and clear communicator. Your task is to generate a human-readable explanation for the given verdict, based on the comprehensive evidence provided.

Claim: {{{claim}}}
Verdict: {{{verdict}}}

Comprehensive Evidence Bundle:
{{{evidence}}}

Instructions:
1.  Synthesize all information within the 'Comprehensive Evidence Bundle' to formulate your explanation.
2.  Your 'explanation' should clearly state the reasoning behind the 'verdict'.
3.  **If the 'verdict' is 'contradicted'**:
    a.  Carefully review the 'Comprehensive Evidence Bundle'.
    b.  If the evidence provides strong, clear support for what the correct information should be, you MUST provide this in the 'correctedInformation' field. Be precise and concise.
    c.  If the evidence is insufficient to confidently state the correct information, omit the 'correctedInformation' field. Do not guess or speculate for the correction.
4.  Ensure your output is a JSON object matching the defined schema.

Example for a contradicted claim with correction:
Input:
{
  "claim": "The moon is made of green cheese.",
  "verdict": "contradicted",
  "evidence": "Scientific analysis indicates the moon is composed primarily of silicate rocks and minerals. No evidence of cheese has ever been found. Trust score for sources confirming rock composition is 0.95."
}
Output:
{
  "explanation": "The claim that the moon is made of green cheese is contradicted by extensive scientific evidence. Analysis of lunar samples and remote sensing data consistently show the moon is composed of silicate rocks and minerals. There is no scientific basis for the cheese hypothesis.",
  "correctedInformation": "The moon is primarily composed of silicate rocks and minerals."
}

Example for a contradicted claim without sufficient evidence for correction:
Input:
{
  "claim": "John Doe privately owns 100 antique cars.",
  "verdict": "contradicted",
  "evidence": "Public records show John Doe owns 5 registered vehicles. No evidence found for 100 antique cars. Trust analysis suggests sources disputing the 100 cars are moderately reliable (0.65), but specific counts vary or are unconfirmed."
}
Output:
{
  "explanation": "The claim that John Doe privately owns 100 antique cars is contradicted. Available public records indicate ownership of a much smaller number of vehicles. While the exact number of antique cars isn't definitively confirmed by the provided evidence, the figure of 100 is not supported.",
  // correctedInformation is omitted as the exact correct number isn't strongly established in the evidence.
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
            explanation: "Could not generate an explanation due to an LLM error.",
        };
    }
    // Ensure correctedInformation is only present if the verdict is 'contradicted' and the AI provided it.
    if (input.verdict !== 'contradicted' && output.correctedInformation) {
        delete output.correctedInformation;
    }
    return output;
  }
);
