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
    // Dacă textul primit este gol, aruncăm o eroare clară
    if (!input.crawledText || !input.crawledText.trim()) {
      throw new Error('analyzeWebsiteBasicsFlow received empty crawledText.');
    }

    console.log(`[analyzeWebsiteBasicsFlow] Analyzing text of length: ${input.crawledText.length}`);

    // Eliminăm logica complexă de "chunking" și trimitem tot textul direct
    // Acest lucru este mult mai robust.

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const { output } = await prompt({ crawledText: input.crawledText });
        if (output) {
          // La succes, returnăm direct rezultatul
          return output;
        }
        throw new Error('No output from prompt.');
      } catch (error: any) {
        console.warn(`Website analysis attempt failed: ${error.message}`);
        retries--;
        if (retries === 0) {
          console.error(`Failed to analyze after several retries: ${error.message}`);
          throw new Error('Failed to analyze website content after multiple retries.');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    // Această parte nu ar trebui să fie atinsă, dar este necesară pentru TypeScript
    throw new Error('Exited retry loop unexpectedly without returning a value.');
  }
);