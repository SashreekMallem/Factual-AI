
'use server';

/**
 * @fileOverview Analyzes the trust chain of evidence sources to understand information reliability, using a simulated internet search tool.
 *
 * - analyzeTrustChain - Analyzes the trust chain of evidence sources.
 * - TrustChainAnalysisInput - Input for the trust chain analysis.
 * - TrustChainAnalysisOutput - Output of the trust chain analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SearchResultSchema = z.object({
  title: z.string().describe('The title of the search result.'),
  link: z.string().describe('The URL of the search result.'),
  snippet: z.string().describe('A short snippet from the search result.'),
});

// Define the tool for internet search
const internetSearchTool = ai.defineTool(
  {
    name: 'internetSearchTool',
    description: 'Performs an internet search to gather more information or verify claims about a given topic or URL. Returns a list of search results.',
    inputSchema: z.object({
      query: z.string().describe('The search query (e.g., the claim text or keywords).'),
    }),
    outputSchema: z.object({
      searchResults: z.array(SearchResultSchema).describe('A list of search results.'),
    }),
  },
  async ({query}) => {
    // In a real application, this would call a search API.
    // For now, we'll return mock search results with a disclaimer.
    console.log(`Simulating internet search for: ${query}`);
    return {
      searchResults: [
        {
          title: `Simulated Result for "${query.substring(0, 30)}..."`,
          link: `https://example.com/search?q=${encodeURIComponent(query)}&source=simulated`,
          snippet: `This is a simulated search result. In a real system, this would be live data. This result pertains to: ${query}.`,
        },
        {
          title: `Another Angle on "${query.substring(0, 30)}..." - Simulated`,
          link: `https://example.org/info?topic=${encodeURIComponent(query)}&source=simulated`,
          snippet: `Further simulated information regarding ${query}. Real applications would use live APIs for up-to-date content.`,
        },
      ],
    };
  }
);

const TrustChainAnalysisInputSchema = z.object({
  claimText: z
    .string()
    .describe('The claim being analyzed, used for context and potential search queries.'),
  sourceUrl: z.string().optional().describe('Optional URL of an initial source to consider.'),
});
export type TrustChainAnalysisInput = z.infer<typeof TrustChainAnalysisInputSchema>;

const TrustChainAnalysisOutputSchema = z.object({
  trustScore: z.number().describe('A score representing the trustworthiness of the information surrounding the claim, based on search results.'),
  reasoning: z.string().describe('Explanation of how the trust score was determined, referencing search findings.'),
  analyzedSources: z.array(SearchResultSchema).optional().describe('Top search results used for analysis if the tool was invoked.'),
});
export type TrustChainAnalysisOutput = z.infer<typeof TrustChainAnalysisOutputSchema>;

export async function analyzeTrustChain(input: TrustChainAnalysisInput): Promise<TrustChainAnalysisOutput> {
  return trustChainAnalysisFlow(input);
}

const trustChainAnalysisPrompt = ai.definePrompt({
  name: 'trustChainAnalysisPrompt',
  tools: [internetSearchTool], // Make the tool available to the LLM
  input: {schema: TrustChainAnalysisInputSchema},
  output: {schema: TrustChainAnalysisOutputSchema},
  prompt: `You are an expert in evaluating the trustworthiness of online information related to a specific claim.
You are given a claim and an optional source URL.
Your primary goal is to assess the trustworthiness related to this claim.

Claim: {{{claimText}}}
{{#if sourceUrl}}Initial Source URL: {{{sourceUrl}}}{{/if}}

Instructions:
1. Analyze the provided claim.
2. If an Initial Source URL is provided, consider it as a starting point for context.
3. CRITICAL: Use the 'internetSearchTool' to find relevant information, articles, or discussions about the claim. You should search based on the claim's content.
4. Based on the search results from the 'internetSearchTool', evaluate the general trustworthiness surrounding the claim.
5. Assign a trust score between 0 and 1 (where 1 is most trustworthy) based on your findings from the search.
6. Provide a brief explanation of your reasoning, referencing significant findings from your search.
7. IMPORTANT: If you use the 'internetSearchTool', include the top 2-3 most relevant search results you used in the 'analyzedSources' field of your output.

Output MUST be a JSON object that looks like this example:
{
  "trustScore": 0.75,
  "reasoning": "Search results from the internetSearchTool indicate the claim is discussed by several sources. For instance, Source X provides supporting details, while Source Y offers a counter-argument.",
  "analyzedSources": [
    { "title": "Example Search Result 1 from Tool", "link": "https://example.com/tool_result1", "snippet": "This result from the tool supports the claim..." },
    { "title": "Example Search Result 2 from Tool", "link": "https://example.com/tool_result2", "snippet": "Another relevant finding from the tool..." }
  ]
}`,
});

const trustChainAnalysisFlow = ai.defineFlow(
  {
    name: 'trustChainAnalysisFlow',
    inputSchema: TrustChainAnalysisInputSchema,
    outputSchema: TrustChainAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await trustChainAnalysisPrompt(input);
    if (!output) {
        throw new Error("Trust chain analysis failed to produce an output.");
    }
    // Ensure analyzedSources is an array, even if empty, if not provided by LLM
    return {
        ...output,
        analyzedSources: output.analyzedSources || [],
    };
  }
);
