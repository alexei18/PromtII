'use server';

/**
 * @fileOverview A flow that performs a basic analysis of website content.
 *
 * - analyzeWebsiteBasics - A function that identifies industry, target audience, and tone of voice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { WebsiteAnalysisSchema, type WebsiteAnalysis } from '@/lib/types';

const AnalyzeWebsiteBasicsInputSchema = z.object({
  crawledText: z.string().describe('The crawled text content from the website.'),
});
export type AnalyzeWebsiteBasicsInput = z.infer<typeof AnalyzeWebsiteBasicsInputSchema>;

export async function analyzeWebsiteBasics(input: AnalyzeWebsiteBasicsInput): Promise<WebsiteAnalysis> {
  return analyzeWebsiteBasicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeWebsiteBasicsPrompt',
  input: { schema: AnalyzeWebsiteBasicsInputSchema },
  output: { schema: WebsiteAnalysisSchema },
  prompt: `# Task
You are a business analyst AI. Your task is to analyze the provided website content and determine the business's industry, target audience, and overall tone of voice.

# Instructions
1.  Read the content from the \`<content>\` tag.
2.  Based *only* on the provided text, identify the following three attributes.
3.  Be concise and specific. For example, instead of "Business", specify "Law firm" or "E-commerce for shoes".
4.  The response MUST be in Romanian.

<content>
{{{crawledText}}}
</content>
`,
});

const analyzeWebsiteBasicsFlow = ai.defineFlow(
  {
    name: 'analyzeWebsiteBasicsFlow',
    inputSchema: AnalyzeWebsiteBasicsInputSchema,
    outputSchema: WebsiteAnalysisSchema,
  },
  async (input) => {
    // Split the content into chunks of pages
    const pages = input.crawledText.split('--- START PAGE:').filter(page => page.trim());
    const chunkSize = 5; // Further reduced chunk size to minimize rate limits
    const analysisResults = [];

    // Pick a subset of pages for analysis, focusing on the most informative ones
    const selectedPages = pages
      .sort((a, b) => b.length - a.length) // Sort by content length
      .slice(0, 10); // Take only top 10 most content-rich pages

    // Process pages in chunks
    for (let i = 0; i < selectedPages.length; i += chunkSize) {
      const pageChunk = selectedPages.slice(i, i + chunkSize);
      const chunkText = pageChunk.join('--- START PAGE:');
      console.log(`Analyzing chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(selectedPages.length / chunkSize)} (${pageChunk.length} pages)`);

      let retries = 3;
      let delay = 5000; // Start with a longer delay to respect rate limits

      while (retries > 0) {
        try {
          const { output } = await prompt({ crawledText: chunkText });
          if (output) {
            analysisResults.push(output);
            break;
          }
          throw new Error('No output from prompt.');
        } catch (error: any) {
          console.warn(`Website analysis attempt failed for chunk: ${error.message}`);
          retries--;
          if (retries === 0) {
            console.error(`Failed to analyze chunk after several retries: ${error.message}`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    if (analysisResults.length === 0) {
      throw new Error('Failed to analyze website: no successful analysis results');
    }

    // Combine and reconcile all analyses
    return {
      industry: analysisResults
        .map(r => r.industry)
        .reduce((prev, curr) => prev.includes(curr) ? prev : `${prev}, ${curr}`),
      targetAudience: analysisResults
        .map(r => r.targetAudience)
        .reduce((prev, curr) => prev.includes(curr) ? prev : `${prev}, ${curr}`),
      toneOfVoice: analysisResults
        .map(r => r.toneOfVoice)
        .reduce((prev, curr) => prev.includes(curr) ? prev : `${prev}, ${curr}`)
    };
  }
);
