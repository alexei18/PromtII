'use server';

/**
 * @fileOverview A flow that performs a deep website crawl and combines the results with
 * user survey responses to generate the final AI system prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { crawlAndExtractContentFlow } from './crawl-and-extract-content';
import { constructTailoredSystemPrompt } from './generate-ai-prompt';
import { WebsiteAnalysisSchema } from '@/lib/types';
import { analyzeWebsiteBasics } from './analyze-website-basics';

const GenerateFinalPromptInputSchema = z.object({
    url: z.string().describe('The website URL to deeply crawl.'),
    formResponses: z.record(z.string()).describe('User-provided responses from the survey.'),
});

const GenerateFinalPromptOutputSchema = z.object({
    finalPrompt: z.string().describe('The final, comprehensive system prompt for the AI model.'),
    fullAnalysis: WebsiteAnalysisSchema.describe('The final analysis based on the deep crawl.'),
});

export type GenerateFinalPromptInput = z.infer<typeof GenerateFinalPromptInputSchema>;
export type GenerateFinalPromptOutput = z.infer<typeof GenerateFinalPromptOutputSchema>;

export async function generateFinalPrompt(input: GenerateFinalPromptInput): Promise<GenerateFinalPromptOutput> {
    return generateFinalPromptFlow(input);
}

const generateFinalPromptFlow = ai.defineFlow(
    {
        name: 'generateFinalPromptFlow',
        inputSchema: GenerateFinalPromptInputSchema,
        outputSchema: GenerateFinalPromptOutputSchema,
    },
    async ({ url, formResponses }) => {
        console.log(`[Phase 2] Starting deep crawl for ${url} to generate final prompt.`);

        // Step 1: Perform a deep crawl of the website (e.g., max 50 pages, depth 2)
        const { crawledText, pageCount } = await crawlAndExtractContentFlow({
            url,
            maxPages: 50,
            crawlDepth: 2,
        });

        if (pageCount === 0) {
            throw new Error('Deep crawl failed to extract content from any pages.');
        }

        console.log(`[Phase 2] Deep crawl complete. Extracted content from ${pageCount} pages.`);

        // Step 2: Re-analyze the website basics using the full content for higher accuracy
        const fullAnalysis = await analyzeWebsiteBasics({ crawledText });

        console.log(`[Phase 2] Final analysis complete. Industry: ${fullAnalysis.industry}`);

        // Step 3: Construct the final system prompt using full content and user responses
        const { finalPrompt } = await constructTailoredSystemPrompt({
            formResponses,
            crawledText,
            analysis: fullAnalysis,
        });

        console.log('[Phase 2] Final prompt generated successfully.');

        return {
            finalPrompt,
            fullAnalysis,
        };
    }
);