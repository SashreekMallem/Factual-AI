
'use server';
/**
 * @fileOverview An AI agent that evaluates the quality of an extracted claim.
 *
 * - evaluateClaimQuality - A function that assesses a claim against quality metrics.
 * - EvaluateClaimQualityInput - The input type for the function.
 * - EvaluateClaimQualityOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateClaimQualityInputSchema = z.object({
  claimText: z.string().describe('The extracted claim to be evaluated.'),
  originalText: z.string().optional().describe('The original text from which the claim was extracted, for context.'),
});
export type EvaluateClaimQualityInput = z.infer<typeof EvaluateClaimQualityInputSchema>;

const ClaimQualityMetricsSchema = z.object({
  atomicity: z.enum(['high', 'medium', 'low']).describe('Assessment of whether the claim is a single, indivisible factual statement.'),
  fluency: z.enum(['good', 'fair', 'poor']).describe('Assessment of grammatical correctness and ease of understanding.'),
  decontextualization: z.enum(['high', 'medium', 'low']).describe('Assessment of whether the claim is understandable on its own without surrounding text.'),
  faithfulness: z.enum(['high', 'medium', 'low', 'na']).describe('Assessment of how accurately the claim represents information from the original text. "na" if original text not provided.'),
  focus: z.enum(['specific', 'neutral', 'broad']).describe('Assessment of whether the claim is specific and not overly broad.'),
  checkworthiness: z.enum(['high', 'medium', 'low']).describe('Assessment of whether the claim is a factual statement that can be verified.'),
  overallAssessment: z.string().describe('A brief overall assessment of the claim\'s quality for verification purposes.'),
});
export type ClaimQualityMetrics = z.infer<typeof ClaimQualityMetricsSchema>;


const EvaluateClaimQualityOutputSchema = ClaimQualityMetricsSchema;
export type EvaluateClaimQualityOutput = z.infer<typeof EvaluateClaimQualityOutputSchema>;

export async function evaluateClaimQuality(input: EvaluateClaimQualityInput): Promise<EvaluateClaimQualityOutput> {
  return evaluateClaimQualityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateClaimQualityPrompt',
  input: {schema: EvaluateClaimQualityInputSchema},
  output: {schema: EvaluateClaimQualityOutputSchema},
  prompt: `You are an expert linguistic analyst specializing in evaluating the quality of factual claims for verification.
Given the claim (and optionally, the original text it was extracted from), assess it based on the following criteria.
Your output MUST be a JSON object matching the defined schema.

Claim: "{{{claimText}}}"
{{#if originalText}}
Original Text: "{{{originalText}}}"
{{/if}}

Evaluation Criteria:
1.  **Atomicity**: Is it a single, indivisible factual statement? (Rate: high, medium, low)
2.  **Fluency**: Is it grammatically correct and easy to understand? (Rate: good, fair, poor)
3.  **Decontextualization**: Is it understandable on its own, without requiring the surrounding text? (Rate: high, medium, low)
4.  **Faithfulness**: Does it accurately represent information stated or implied in the original text? (Rate: high, medium, low, or 'na' if original text not provided)
5.  **Focus**: Is it specific and not overly broad or vague? (Rate: specific, neutral, broad)
6.  **Check-worthiness**: Is it a factual statement that can be checked for truthfulness against evidence (not an opinion, question, or non-factual statement)? (Rate: high, medium, low)

Provide an 'overallAssessment' summarizing the claim's suitability for fact-checking.
`,
});

const evaluateClaimQualityFlow = ai.defineFlow(
  {
    name: 'evaluateClaimQualityFlow',
    inputSchema: EvaluateClaimQualityInputSchema,
    outputSchema: EvaluateClaimQualityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        // Provide default/fallback values if the LLM fails to produce an output
        return {
            atomicity: 'low',
            fluency: 'poor',
            decontextualization: 'low',
            faithfulness: input.originalText ? 'low' : 'na',
            focus: 'broad',
            checkworthiness: 'low',
            overallAssessment: 'Could not evaluate claim quality due to an LLM error.'
        };
    }
    return output;
  }
);
