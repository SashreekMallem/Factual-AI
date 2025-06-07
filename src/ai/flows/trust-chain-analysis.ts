'use server';

/**
 * @fileOverview Analyzes the trust chain of evidence sources to understand information reliability, using a live internet search tool (DuckDuckGo API) and LLM-generated search queries.
 * It simulates deeper trust chain reasoning by prompting the LLM to speculate on source provenance.
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
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `DuckDuckGo API request failed for query: ${query.substring(0,100)}...`
        }] };
      }

      const data = await response.json();
      // console.log(`DuckDuckGo API response for query "${query}":`, JSON.stringify(data, null, 2));


      if (data.AbstractText) {
        const abstractLink = data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        searchResults.push({
          title: data.Heading || query,
          link: abstractLink,
          snippet: data.AbstractText,
        });
         // console.log(`Added abstract result: ${data.Heading} - ${abstractLink}`);
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
                // console.log(`Added related topic: ${title} - ${topic.FirstURL}`);
            }
          }
        });
      }
      
      if (searchResults.length === 0 && data.Heading && data.Type === 'A' && data.AbstractText === '') { // Only add if AbstractText was empty
         searchResults.push({
          title: data.Heading,
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "General information or definition found on DuckDuckGo."
        });
        // console.log(`Added heading as result: ${data.Heading}`);
      }

    } catch (error) {
      console.error('Error fetching or parsing DuckDuckGo API response:', error);
      return { searchResults: [{
        title: "Search Execution Error",
        link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `Could not perform live internet search for "${query.substring(0,100)}..." due to an error.`
      }] };
    }
    
    if (searchResults.length === 0) {
        searchResults.push({
            title: `No specific results for "${query.substring(0,50)}..."`,
            link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: "DuckDuckGo Instant Answer API did not return specific articles. Try rephrasing or use a broader search engine for deeper results."
        });
        // console.log(`No specific results found for query: ${query}`);
    }
    // console.log("Final search results from tool:", searchResults);
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
  trustScore: z.number().min(0).max(1).describe('A score between 0 and 1 representing the trustworthiness of the information surrounding the claim, based on live search results from DuckDuckGo and a simulated analysis of the plausible trust chain. Consider the authority and relevance of sources found, how many steps removed they likely are from primary information, and if links were accessible.'),
  reasoning: z.string().describe('Explanation of how the trust score was determined, referencing search findings from DuckDuckGo and reasoning about the plausible trust chain for key pieces of evidence. Comment on the perceived authority, relevance, and likely provenance of the found sources. If any provided links seemed broken or led to "page not found," mention this and explain how snippet information or corroboration was used instead. Describe the simulated trust chain for key pieces of evidence.'),
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
  input: { schema: z.object({ 
    claimText: z.string(),
    searchQueryUsed: z.string(),
  })},
  output: {schema: TrustChainAnalysisOutputSchema},
  prompt: `You are an expert in evaluating the trustworthiness of online information and tracing information provenance related to a specific claim.
You are given a claim. An optimal search query has already been generated and used to search the internet via DuckDuckGo Instant Answer API, providing initial search results.

Claim: {{{claimText}}}
Search Query Used: {{{searchQueryUsed}}}

Instructions:
1.  CRITICAL: Use the 'internetSearchTool' with the provided 'searchQueryUsed' to find relevant information about the claim. The tool uses DuckDuckGo's Instant Answer API, which provides summaries and may sometimes have outdated links.
2.  Based on the search results, analyze each significant piece of evidence. For each, consider:
    a.  The **type of source** (e.g., .gov, .edu, Wikipedia, reputable news, blog, forum).
    b.  The **content of the snippet**.
    c.  **Plausible Provenance (Simulated Trust Chain):**
        *   How many steps removed from an original source (e.g., primary research, official report, eyewitness account) do you estimate this information to be?
        *   What kind of primary information might this source be based on (e.g., if it's a news article summarizing a study, the study itself is closer to the origin)?
        *   If a source mentions 'a study,' 'researchers found,' or 'experts say,' but doesn't directly link to or name the original, how does that affect its immediate verifiability and your confidence in it as a primary piece of evidence for *this* analysis?
    d.  **Link Accessibility**: Acknowledge if links from the search tool appear outdated or lead to "page not found." If so, rely more on the snippet and look for corroboration.
3.  Synthesize your findings for the overall claim:
    a.  Evaluate the general trustworthiness and consensus surrounding the claim based on your analysis of the simulated trust chains of the evidence found.
    b.  Assign a trust score between 0.0 and 1.0 (where 1.0 is most trustworthy). This score should reflect your assessment of the sources found AND your confidence in the plausible provenance of the information. Information that seems many steps removed from an original source, or whose origins are very unclear from the snippets, should generally receive a lower trust score.
4.  Provide a detailed explanation of your reasoning.
    *   Reference significant findings from your search.
    *   Explicitly comment on the perceived authority of the immediate sources.
    *   **Critically, describe your reasoning about the plausible trust chain for key pieces of evidence.** For instance: "Source A (news article snippet) appears to summarize a government report. While the report itself wasn't directly in the search results, the nature of the claim aligns with typical government publications, lending some confidence. Source B (blog post) references 'studies' vaguely, making its chain to original evidence weaker."
    *   If link accessibility was an issue, mention this and explain its impact.
5.  IMPORTANT: If you use the 'internetSearchTool', include the top 2-3 most relevant search results you used in the 'analyzedSources' field of your output. If the tool returns no results or an error, reflect this in your reasoning and score.
6.  Include the 'searchQueryUsed' in the 'generatedSearchQuery' field of your output.

Output MUST BE a JSON object. Example:
{
  "trustScore": 0.5,
  "reasoning": "DuckDuckGo results for 'Example Claim study' included a news site snippet mentioning 'a recent university study' and a Wikipedia article. The news link was accessible but summarized findings without linking the original study. The Wikipedia article cited several sources, one of which was a .edu domain link that was not accessible (page not found). Plausible Trust Chain for News: News -> University Study (not directly seen). Plausible Trust Chain for Wikipedia: Wikipedia -> Multiple sources (some inaccessible). The overall trust is moderate because primary evidence (the study itself) was not directly surfaced by the search, and one key link was broken, requiring reliance on summaries.",
  "analyzedSources": [
    { "title": "News Site: University Study on Example Claim", "link": "https://news.example.com/study_example", "snippet": "A recent university study found that..." },
    { "title": "Wikipedia - Example Claim", "link": "https://en.wikipedia.org/wiki/Example_Claim", "snippet": "Wikipedia article discussing the example claim, citing [1] University Study, [2] Gov Report..." }
  ],
  "generatedSearchQuery": "Example Claim study official"
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
    let primarySearchQuery = input.claimText; 
    let generatedQueries: string[] = [];
    try {
      const queryGenResult = await generateSearchQueriesPrompt({ claimText: input.claimText });
      if (queryGenResult.output?.queries && queryGenResult.output.queries.length > 0) {
        generatedQueries = queryGenResult.output.queries;
        primarySearchQuery = generatedQueries[0]; 
        // console.log(`Generated search queries for "${input.claimText.substring(0,50)}...":`, generatedQueries);
      } else {
        // console.warn(`Could not generate specific search queries for "${input.claimText.substring(0,50)}...", using claim text as query.`);
      }
    } catch (e) {
      // console.error(`Error generating search queries for "${input.claimText.substring(0,50)}...":`, e);
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
        analyzedSources: output.analyzedSources || [],
        generatedSearchQuery: output.generatedSearchQuery || primarySearchQuery,
    };
  }
);

