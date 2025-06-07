
'use server';

/**
 * @fileOverview Analyzes the trust chain of evidence sources to understand information reliability, using a live internet search tool (DuckDuckGo Instant Answer API) and LLM-generated search queries.
 * It simulates deeper trust chain reasoning by prompting the LLM to speculate on source provenance based on the summarized results from DuckDuckGo.
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
  queries: z.array(z.string()).min(1).max(3).describe('An array of 1 to 3 diverse, high-precision search queries tailored to find evidence for the claim. Prioritize queries likely to hit authoritative domains (e.g., .gov, .edu, Wikipedia) if DuckDuckGo Instant Answers can surface them.'),
});

const generateSearchQueriesPrompt = ai.definePrompt({
  name: 'generateSearchQueriesPrompt',
  input: {schema: SearchQueryGenerationInputSchema},
  output: {schema: SearchQueryGenerationOutputSchema},
  prompt: `Given the following claim, generate 2-3 diverse, high-precision search queries for use with the DuckDuckGo Instant Answer API. This API provides summaries and related topics, not a full list of web pages. Focus on queries that might trigger useful abstracts or links to primary entities (like Wikipedia, .gov sites if applicable) via DuckDuckGo's curated results.

Claim: "{{{claimText}}}"

Generated Search Queries (array of strings):
`,
});


const SearchResultSchema = z.object({
  title: z.string().describe('The title of the search result or abstract.'),
  link: z.string().describe('The URL of the search result (might be a DuckDuckGo internal link or an external site).'),
  snippet: z.string().describe('A short snippet from the search result or the abstract text.'),
  type: z.string().optional().describe('Type of result, e.g., "Abstract", "RelatedTopic", "Article", "Definition".'),
});

const internetSearchTool = ai.defineTool(
  {
    name: 'internetSearchTool',
    description:
      "Performs an internet search using DuckDuckGo's Instant Answer API to gather summarized information or identify key entities related to a topic. Returns abstracts, definitions, and related topics. It does NOT return a comprehensive list of direct website links like a full web search.",
    inputSchema: z.object({
      query: z.string().describe('The search query (e.g., the claim text or keywords).'),
    }),
    outputSchema: z.object({
      searchResults: z.array(SearchResultSchema).describe('A list of search results, abstracts, or related topics from DuckDuckGo Instant Answer API.'),
    }),
  },
  async ({query}) => {
    console.log(`Performing live internet search (DuckDuckGo Instant Answer API) for: ${query}`);
    const searchResults: z.infer<typeof SearchResultSchema>[] = [];
    
    try {
      const DDG_API_URL = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await fetch(DDG_API_URL);

      if (!response.ok) {
        console.error(`DuckDuckGo API request failed with status: ${response.status}`);
        searchResults.push({
          title: "Search API Error",
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, // Fallback to general DDG search page
          snippet: `DuckDuckGo API request failed for query: ${query.substring(0,100)}... Status: ${response.status}. Direct access to a broad set of websites is not provided by this API.`,
          type: "APIError"
        });
        return { searchResults };
      }

      const data = await response.json();
      
      if (data.AbstractText) {
        searchResults.push({
          title: data.AbstractURL ? data.Heading : `Abstract for: ${data.Heading || query}`,
          link: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: data.AbstractText,
          type: "Abstract",
        });
      }

      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, 3).forEach((topic: any) => {
          if (topic.Result && topic.FirstURL) { // DDG API sometimes wraps results in a 'Result' key
            const resultMatch = topic.Result.match(/<a href="([^"]+)">([^<]+)<\/a>(.*)/);
            if (resultMatch) {
                const title = resultMatch[2];
                const link = resultMatch[1];
                const textSnippet = resultMatch[3] ? resultMatch[3].replace(/^- /, '').trim() : title;
                 if (!searchResults.some(sr => sr.link === link)) {
                    searchResults.push({
                        title: title,
                        link: link,
                        snippet: textSnippet || "Related topic from DuckDuckGo.",
                        type: "RelatedTopic"
                    });
                }
            } else if (topic.Text && topic.FirstURL) { // Fallback for simpler structure
                 if (!searchResults.some(sr => sr.link === topic.FirstURL)) {
                    searchResults.push({
                        title: topic.Text.split(' - ')[0].substring(0,100),
                        link: topic.FirstURL,
                        snippet: topic.Text || "Related topic from DuckDuckGo.",
                        type: "RelatedTopic"
                    });
                }
            }
          }
        });
      }
      
      if (data.DefinitionSource && data.Definition) {
         if (!searchResults.some(sr => sr.link === data.DefinitionURL)) {
            searchResults.push({
                title: `Definition from ${data.DefinitionSource}: ${data.Heading || query}`,
                link: data.DefinitionURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                snippet: data.Definition,
                type: "Definition"
            });
         }
      }
      
      if (searchResults.length === 0 && data.Heading && data.AbstractText === '' && data.Answer) { 
         searchResults.push({
          title: data.Heading,
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: data.Answer || "General information or answer found on DuckDuckGo.",
          type: "Answer"
        });
      } else if (searchResults.length === 0 && data.Heading && data.AbstractText === '') {
         searchResults.push({
          title: `General result for: ${data.Heading || query}`,
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "DuckDuckGo Instant Answer API provided a general result or category.",
          type: "General"
        });
      }


    } catch (error) {
      console.error('Error fetching or parsing DuckDuckGo API response:', error);
      searchResults.push({
        title: "Search Execution Error",
        link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `Could not perform live internet search for "${query.substring(0,100)}..." due to an error. The DuckDuckGo Instant Answer API might be unavailable or the query returned no usable results. This API provides summaries and related topics, not direct website links.`,
        type: "ToolExecutionError"
      });
       return { searchResults };
    }
    
    if (searchResults.length === 0) {
        searchResults.push({
            title: `No specific results from DuckDuckGo Instant Answer API for "${query.substring(0,50)}..."`,
            link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: "The DuckDuckGo Instant Answer API did not return specific abstracts, definitions, or related topics for this query. For broader web results, a different type of search tool would be needed.",
            type: "NoSpecificResults"
        });
    }
    return { searchResults };
  }
);

const TrustChainAnalysisInputSchema = z.object({
  claimText: z
    .string()
    .describe('The claim being analyzed, used for context and potential search queries.'),
});
export type TrustChainAnalysisInput = z.infer<typeof TrustChainAnalysisInputSchema>;

const TrustChainAnalysisOutputSchema = z.object({
  trustScore: z.number().min(0).max(1).describe('A score between 0 and 1 representing the trustworthiness of the information surrounding the claim, based on results from DuckDuckGo Instant Answer API and a simulated analysis of the plausible trust chain. Consider the authority and relevance of sources/summaries found, how many steps removed they likely are from primary information, and if links were accessible or relevant.'),
  reasoning: z.string().describe('Explanation of how the trust score was determined, referencing search findings from DuckDuckGo Instant Answer API and reasoning about the plausible trust chain for key pieces of evidence. Comment on the perceived authority, relevance, and likely provenance of the found sources/summaries. If any provided links seemed broken, led to "page not found," or were not directly relevant, mention this and explain how snippet information or corroboration was used instead. Describe the simulated trust chain for key pieces of evidence.'),
  analyzedSources: z.array(SearchResultSchema).optional().describe('Top search results (abstracts, related topics, definitions) from DuckDuckGo Instant Answer API used for analysis if the tool was invoked.'),
  generatedSearchQuery: z.string().optional().describe('The primary search query that was generated by the LLM and used with the internetSearchTool.'),
});
export type TrustChainAnalysisOutput = z.infer<typeof TrustChainAnalysisOutputSchema>;

export async function analyzeTrustChain(input: TrustChainAnalysisInput): Promise<TrustChainAnalysisOutput> {
  return trustChainAnalysisFlow(input);
}

const trustChainAnalysisPrompt = ai.definePrompt({
  name: 'trustChainAnalysisPrompt',
  tools: [internetSearchTool], 
  input: { schema: z.object({ 
    claimText: z.string(),
    searchQueryUsed: z.string(),
  })},
  output: {schema: TrustChainAnalysisOutputSchema},
  prompt: `You are an expert in evaluating the trustworthiness of online information and simulating the tracing of information provenance related to a specific claim.
You are given a claim. An optimal search query has already been generated and used with the DuckDuckGo Instant Answer API. This API provides **summaries, definitions, and related topics**, not a comprehensive list of direct website links like a full web search.

Claim: {{{claimText}}}
Search Query Used: {{{searchQueryUsed}}}

Instructions:
1.  CRITICAL: Use the 'internetSearchTool' with the provided 'searchQueryUsed' to fetch information using the DuckDuckGo Instant Answer API. Remember, this tool returns summaries and curated results, not a direct list of diverse web pages.
2.  Based on the search results (which may be abstracts, definitions, or links to specific entities like Wikipedia):
    a.  Analyze each significant piece of information. For each, consider:
        *   The **type of result** (e.g., Abstract, RelatedTopic, Definition, link to .gov, .edu, Wikipedia).
        *   The **content of the snippet/abstract**.
        *   **Plausible Provenance (Simulated Trust Chain):**
            *   How many steps removed from an original source (e.g., primary research, official report, eyewitness account) do you estimate this information to be, given the nature of the DuckDuckGo Instant Answer?
            *   What kind of primary information might this source/summary be based on (e.g., if it's a summary, what is it summarizing)?
            *   If a source mentions 'a study,' 'researchers found,' or 'experts say,' but doesn't directly link to or name the original, how does that affect its immediate verifiability given the limitations of the search tool?
        *   **Link Accessibility & Relevance**: Acknowledge if links from the search tool (if any direct external links are provided) appear outdated, lead to "page not found," or if the result is a general DuckDuckGo topic page rather than a specific external source. If so, rely more on the snippet and look for corroboration.
3.  Synthesize your findings for the overall claim:
    a.  Evaluate the general trustworthiness and consensus surrounding the claim based on your analysis of the simulated trust chains of the evidence found via DuckDuckGo Instant Answers.
    b.  Assign a trust score between 0.0 and 1.0 (where 1.0 is most trustworthy). This score should reflect your assessment of the sources/summaries found AND your confidence in the plausible provenance of the information. Information that seems many steps removed from an original source, whose origins are very unclear from the snippets, or if only very general DDG topics were returned, should generally receive a lower trust score.
4.  Provide a detailed explanation of your reasoning.
    *   Reference significant findings from your DuckDuckGo search.
    *   Explicitly comment on the perceived authority of the immediate sources/summaries.
    *   **Critically, describe your reasoning about the plausible trust chain for key pieces of evidence based on the nature of DuckDuckGo Instant Answers.** For instance: "DuckDuckGo provided an abstract for 'Example Claim' which appears to summarize a government report. While the report itself wasn't directly linked as a distinct search result, the nature of the claim aligns with typical government publications, lending some confidence. Another result was a related topic pointing to a general Wikipedia page on 'Example Concept,' which is a useful starting point but not primary evidence."
    *   If link accessibility or relevance of links was an issue, mention this and explain its impact.
5.  IMPORTANT: If you use the 'internetSearchTool', include the top 2-3 most relevant search results (abstracts, topics, etc.) you used in the 'analyzedSources' field of your output. If the tool returns no relevant results or an error, reflect this in your reasoning and score.
6.  Include the 'searchQueryUsed' in the 'generatedSearchQuery' field of your output.

Output MUST BE a JSON object.
`,
});

const trustChainAnalysisFlow = ai.defineFlow(
  {
    name: 'trustChainAnalysisFlow',
    inputSchema: TrustChainAnalysisInputSchema,
    outputSchema: TrustChainAnalysisOutputSchema,
  },
  async (input) => {
    // Step 1: Generate search queries using an LLM
    let primarySearchQuery = input.claimText; 
    let generatedQueries: string[] = [];
    try {
      const queryGenResult = await generateSearchQueriesPrompt({ claimText: input.claimText });
      if (queryGenResult.output?.queries && queryGenResult.output.queries.length > 0) {
        generatedQueries = queryGenResult.output.queries;
        primarySearchQuery = generatedQueries[0]; 
      }
    } catch (e) {
      console.warn(`Error generating search queries for "${input.claimText.substring(0,50)}...":`, e);
    }

    // Step 2: Call the main analysis prompt with the selected search query
    const {output} = await trustChainAnalysisPrompt({
      claimText: input.claimText,
      searchQueryUsed: primarySearchQuery,
    });

    if (!output) {
        console.error("Trust chain analysis prompt failed to produce an output for claim:", input.claimText);
        return {
            trustScore: 0,
            reasoning: "Trust chain analysis failed to produce an output. The LLM might have encountered an issue. No sources could be analyzed, and no trust chain could be simulated.",
            analyzedSources: [],
            generatedSearchQuery: primarySearchQuery
        };
    }
    
    return {
        ...output,
        analyzedSources: output.analyzedSources?.map(src => ({...src, type: src.type || "Unknown"})) || [], // Ensure type field
        generatedSearchQuery: output.generatedSearchQuery || primarySearchQuery,
    };
  }
);

    