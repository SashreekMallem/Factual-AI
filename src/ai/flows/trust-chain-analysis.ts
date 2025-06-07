
'use server';

/**
 * @fileOverview Analyzes the trust chain of evidence sources to understand information reliability, using a live internet search tool (DuckDuckGo API).
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

// Define the tool for internet search using DuckDuckGo API
const internetSearchTool = ai.defineTool(
  {
    name: 'internetSearchTool',
    description:
      "Performs an internet search using DuckDuckGo's Instant Answer API to gather information or verify claims about a given topic. Returns a list of search results. Useful for getting quick facts, definitions, or summaries.",
    inputSchema: z.object({
      query: z.string().describe('The search query (e.g., the claim text or keywords).'),
    }),
    outputSchema: z.object({
      searchResults: z.array(SearchResultSchema).describe('A list of search results from DuckDuckGo.'),
    }),
  },
  async ({query}) => {
    console.log(`Performing live internet search (DuckDuckGo) for: ${query}`);
    const searchResults: z.infer<typeof SearchResultSchema>[] = [];
    
    try {
      const DDG_API_URL = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await fetch(DDG_API_URL);

      if (!response.ok) {
        console.error(`DuckDuckGo API request failed with status: ${response.status}`);
        // Return empty results or a specific error object if preferred
        return { searchResults: [] };
      }

      const data = await response.json();

      // Primary Answer (if available)
      if (data.AbstractText) {
        searchResults.push({
          title: data.Heading || query,
          link: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: data.AbstractText,
        });
      }

      // Related Topics (can be quite broad)
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, 3).forEach((topic: any) => { // Limit to first 3 related topics for brevity
          if (topic.Text && topic.FirstURL) {
             // Sometimes topic.Text includes the title and snippet separated by " - "
            const parts = topic.Text.split(' - ');
            const title = parts.length > 1 ? parts[0] : topic.Text.substring(0, 80); // Take first part or first 80 chars
            const snippet = parts.length > 1 ? parts.slice(1).join(' - ') : topic.Text;
            
            // Avoid duplicating the primary abstract if it's very similar
            if (!searchResults.some(sr => sr.link === topic.FirstURL)) {
                 searchResults.push({
                    title: title,
                    link: topic.FirstURL,
                    snippet: snippet,
                });
            }
          }
        });
      }
      
      // Fallback if no good results found from specific fields
      if (searchResults.length === 0 && data.Heading && data.Type === 'A') { // 'A' for Article/Abstract
         searchResults.push({
          title: data.Heading,
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, // General link if specific AbstractURL is missing
          snippet: "General information found on DuckDuckGo."
        });
      }


    } catch (error) {
      console.error('Error fetching or parsing DuckDuckGo API response:', error);
      // Return empty or specific error result
      return { searchResults: [{
        title: "Search Error",
        link: "#",
        snippet: "Could not perform live internet search due to an error."
      }] };
    }
    
    if (searchResults.length === 0) {
        searchResults.push({
            title: `No specific results found for "${query.substring(0,50)}..." via DuckDuckGo`,
            link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: "Try rephrasing your query or using more general terms. This search uses DuckDuckGo's Instant Answer API which provides summaries."
        });
    }

    return { searchResults };
  }
);

const TrustChainAnalysisInputSchema = z.object({
  claimText: z
    .string()
    .describe('The claim being analyzed, used for context and potential search queries.'),
  sourceUrl: z.string().optional().describe('Optional URL of an initial source to consider for context (will not be directly fetched, but can inform search).'),
});
export type TrustChainAnalysisInput = z.infer<typeof TrustChainAnalysisInputSchema>;

const TrustChainAnalysisOutputSchema = z.object({
  trustScore: z.number().describe('A score between 0 and 1 representing the trustworthiness of the information surrounding the claim, based on live search results from DuckDuckGo.'),
  reasoning: z.string().describe('Explanation of how the trust score was determined, referencing search findings from DuckDuckGo.'),
  analyzedSources: z.array(SearchResultSchema).optional().describe('Top search results from DuckDuckGo used for analysis if the tool was invoked.'),
});
export type TrustChainAnalysisOutput = z.infer<typeof TrustChainAnalysisOutputSchema>;

export async function analyzeTrustChain(input: TrustChainAnalysisInput): Promise<TrustChainAnalysisOutput> {
  return trustChainAnalysisFlow(input);
}

const trustChainAnalysisPrompt = ai.definePrompt({
  name: 'trustChainAnalysisPrompt',
  tools: [internetSearchTool], 
  input: {schema: TrustChainAnalysisInputSchema},
  output: {schema: TrustChainAnalysisOutputSchema},
  prompt: `You are an expert in evaluating the trustworthiness of online information related to a specific claim.
You are given a claim and an optional source URL (for context only, do not attempt to fetch this URL).
Your primary goal is to assess the trustworthiness related to this claim using live internet search data.

Claim: {{{claimText}}}
{{#if sourceUrl}}Initial Source URL (for context): {{{sourceUrl}}}{{/if}}

Instructions:
1. Analyze the provided claim.
2. CRITICAL: Use the 'internetSearchTool' to find relevant information, articles, or discussions about the claim. You MUST search based on the claim's content to get live data.
3. Based on the search results from the 'internetSearchTool' (which uses DuckDuckGo), evaluate the general trustworthiness and consensus surrounding the claim. Consider the types of sources found.
4. Assign a trust score between 0 and 1 (where 1 is most trustworthy) based on your findings from the search. Be realistic about the limitations of summary-level search results.
5. Provide a brief explanation of your reasoning, referencing significant findings from your search (e.g., "DuckDuckGo results show...").
6. IMPORTANT: If you use the 'internetSearchTool', include the top 2-3 most relevant search results you used in the 'analyzedSources' field of your output. If the tool returns no results or an error, reflect this in your reasoning and score.

Output MUST be a JSON object that looks like this example:
{
  "trustScore": 0.65,
  "reasoning": "Live search results from DuckDuckGo for the claim indicate some discussion by various sources. For instance, one result provided a brief definition supporting parts of the claim, while another was less conclusive. The information is somewhat general.",
  "analyzedSources": [
    { "title": "Example Search Result 1 from DuckDuckGo", "link": "https://example.com/ddg_result1", "snippet": "This result from the tool provides a quick summary..." },
    { "title": "Example Search Result 2 from DuckDuckGo", "link": "https://example.com/ddg_result2", "snippet": "Another relevant finding from the tool..." }
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
    // Ensure analyzedSources is an array, even if empty, if not provided by LLM or if tool failed.
    return {
        ...output,
        analyzedSources: output.analyzedSources || [],
    };
  }
);

