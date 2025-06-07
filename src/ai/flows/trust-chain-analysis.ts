
'use server';

/**
 * @fileOverview Analyzes the trust chain of evidence sources to understand information reliability, using a live internet search tool (DuckDuckGo API) and LLM-generated search queries.
 *
 * - analyzeTrustChain - Analyzes the trust chain of evidence sources.
 * - TrustChainAnalysisInput - Input for the trust chain analysis.
 * - TrustChainAnalysisOutput - Output of the trust chain analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SearchQueryGenerationInputSchema = z.object({
  claimText: z.string().describe('The claim for which to generate search queries.'),
});

const SearchQueryGenerationOutputSchema = z.object({
  queries: z.array(z.string()).min(1).max(3).describe('An array of 1 to 3 diverse, high-precision search queries tailored to find evidence for the claim. Prioritize queries likely to hit authoritative domains (e.g., .gov, .edu, Wikipedia).'),
});

const generateSearchQueriesPrompt = ai.definePrompt({
  name: 'generateSearchQueriesPrompt',
  input: {schema: SearchQueryGenerationInputSchema},
  output: {schema: SearchQueryGenerationOutputSchema},
  prompt: `Given the following claim, generate 2-3 diverse, high-precision search queries. These queries should be designed to maximize the likelihood of retrieving relevant and authoritative evidence from the web. Focus on queries that might target reputable sources like government sites, educational institutions, or well-known encyclopedias.

Claim: "{{{claimText}}}"

Generated Search Queries (array of strings):
`,
});


const SearchResultSchema = z.object({
  title: z.string().describe('The title of the search result.'),
  link: z.string().describe('The URL of the search result.'),
  snippet: z.string().describe('A short snippet from the search result.'),
});

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
        return { searchResults: [{
          title: "Search API Error",
          link: "#",
          snippet: `DuckDuckGo API request failed for query: ${query.substring(0,100)}...`
        }] };
      }

      const data = await response.json();

      if (data.AbstractText) {
        searchResults.push({
          title: data.Heading || query,
          link: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: data.AbstractText,
        });
      }

      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, 3).forEach((topic: any) => {
          if (topic.Text && topic.FirstURL) {
            const parts = topic.Text.split(' - ');
            const title = parts.length > 1 ? parts[0] : topic.Text.substring(0, 80);
            const snippet = parts.length > 1 ? parts.slice(1).join(' - ') : topic.Text;
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
      
      if (searchResults.length === 0 && data.Heading && data.Type === 'A') {
         searchResults.push({
          title: data.Heading,
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "General information found on DuckDuckGo."
        });
      }

    } catch (error) {
      console.error('Error fetching or parsing DuckDuckGo API response:', error);
      return { searchResults: [{
        title: "Search Execution Error",
        link: "#",
        snippet: `Could not perform live internet search for "${query.substring(0,100)}..." due to an error.`
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
  // sourceUrl is removed as we now generate queries from claimText
});
export type TrustChainAnalysisInput = z.infer<typeof TrustChainAnalysisInputSchema>;

const TrustChainAnalysisOutputSchema = z.object({
  trustScore: z.number().min(0).max(1).describe('A score between 0 and 1 representing the trustworthiness of the information surrounding the claim, based on live search results from DuckDuckGo. Consider the authority and relevance of sources found (e.g., .gov, .edu domains, Wikipedia are generally more trustworthy than personal blogs).'),
  reasoning: z.string().describe('Explanation of how the trust score was determined, referencing search findings from DuckDuckGo, and commenting on the perceived authority and relevance of the found sources.'),
  analyzedSources: z.array(SearchResultSchema).optional().describe('Top search results from DuckDuckGo used for analysis if the tool was invoked.'),
  generatedSearchQuery: z.string().optional().describe('The primary search query that was generated by the LLM and used with the internetSearchTool.'),
});
export type TrustChainAnalysisOutput = z.infer<typeof TrustChainAnalysisOutputSchema>;

export async function analyzeTrustChain(input: TrustChainAnalysisInput): Promise<TrustChainAnalysisOutput> {
  return trustChainAnalysisFlow(input);
}

const trustChainAnalysisPrompt = ai.definePrompt({
  name: 'trustChainAnalysisPrompt',
  tools: [internetSearchTool], 
  input: { schema: z.object({ // Input to this specific prompt includes the claim and the *selected* query
    claimText: z.string(),
    searchQueryUsed: z.string(),
  })},
  output: {schema: TrustChainAnalysisOutputSchema},
  prompt: `You are an expert in evaluating the trustworthiness of online information related to a specific claim.
You are given a claim. An optimal search query has already been generated and used to search the internet via DuckDuckGo.

Claim: {{{claimText}}}
Search Query Used: {{{searchQueryUsed}}}

Instructions:
1.  CRITICAL: Use the 'internetSearchTool' with the provided 'searchQueryUsed' to find relevant information about the claim.
2.  Based on the search results from the 'internetSearchTool' (which uses DuckDuckGo):
    a.  Evaluate the general trustworthiness and consensus surrounding the claim.
    b.  Pay attention to the *types* of sources found (e.g., are they from .gov, .edu domains, Wikipedia, reputable news organizations, or personal blogs/forums?).
    c.  Consider the relevance and apparent authority of these sources.
3.  Assign a trust score between 0.0 and 1.0 (where 1.0 is most trustworthy). This score should reflect your assessment of the sources found by DuckDuckGo. A higher score should be given if authoritative and relevant sources are found. A lower score if sources are scarce, low-quality, or contradictory without clear resolution from authoritative sites.
4.  Provide a brief explanation of your reasoning. Reference significant findings from your search (e.g., "DuckDuckGo results included a .gov site which supports X, but also several forum discussions with mixed opinions..."). Explicitly comment on the perceived authority of the sources found.
5.  IMPORTANT: If you use the 'internetSearchTool', include the top 2-3 most relevant search results you used in the 'analyzedSources' field of your output. If the tool returns no results or an error, reflect this in your reasoning and score (e.g., assign a low trust score).
6.  Include the 'searchQueryUsed' in the 'generatedSearchQuery' field of your output.

Output MUST be a JSON object. Example:
{
  "trustScore": 0.7,
  "reasoning": "DuckDuckGo results for the query 'Example Claim official sources' showed a Wikipedia page and an .edu domain article that largely support the claim's premise. Some blog posts offered anecdotal counter-points but lacked strong evidence. The presence of academic and encyclopedic sources lends moderate credibility.",
  "analyzedSources": [
    { "title": "Wikipedia - Example Claim", "link": "https://en.wikipedia.org/wiki/Example_Claim", "snippet": "Wikipedia article discussing the example claim..." },
    { "title": "University Study on Example Claim - edu.example", "link": "https://www.edu.example/study_example_claim", "snippet": "An academic paper from example.edu..." }
  ],
  "generatedSearchQuery": "Example Claim official sources"
}`,
});

const trustChainAnalysisFlow = ai.defineFlow(
  {
    name: 'trustChainAnalysisFlow',
    inputSchema: TrustChainAnalysisInputSchema,
    outputSchema: TrustChainAnalysisOutputSchema,
  },
  async (input) => {
    // Step 1: Generate search queries using an LLM
    let primarySearchQuery = input.claimText; // Fallback query
    let generatedQueries: string[] = [];
    try {
      const queryGenResult = await generateSearchQueriesPrompt({ claimText: input.claimText });
      if (queryGenResult.output?.queries && queryGenResult.output.queries.length > 0) {
        generatedQueries = queryGenResult.output.queries;
        primarySearchQuery = generatedQueries[0]; // Use the first generated query
        console.log(`Generated search queries for "${input.claimText}":`, generatedQueries);
      } else {
        console.warn(`Could not generate specific search queries for "${input.claimText}", using claim text as query.`);
      }
    } catch (e) {
      console.error(`Error generating search queries for "${input.claimText}":`, e);
    }

    // Step 2: Call the main analysis prompt with the selected search query
    const {output} = await trustChainAnalysisPrompt({
      claimText: input.claimText,
      searchQueryUsed: primarySearchQuery,
    });

    if (!output) {
        throw new Error("Trust chain analysis failed to produce an output.");
    }
    
    return {
        ...output,
        analyzedSources: output.analyzedSources || [],
        // Ensure generatedSearchQuery is populated, even if the LLM forgets to include it in the structured output
        generatedSearchQuery: output.generatedSearchQuery || primarySearchQuery,
    };
  }
);
