'use server';

/**
 * @fileOverview A flow that performs a quick analysis of a website to generate tailored survey questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { quickScanFlow } from './quick-scan'; // MODIFICAT: Folosim noul flux rapid
import { analyzeWebsiteBasics } from './analyze-website-basics';
import { generateTailoredSurveyQuestions } from './generate-survey-questions';
import { SurveyQuestionSchema, WebsiteAnalysisSchema } from '@/lib/types';

const AnalyzeWebsiteForSurveyInputSchema = z.object({
    url: z.string().describe('The website URL to analyze.'),
});

const AnalyzeWebsiteForSurveyOutputSchema = z.object({
    questions: z.array(SurveyQuestionSchema).describe('The generated survey questions.'),
    analysis: WebsiteAnalysisSchema.describe('The initial analysis of the website.'),
    crawledText: z.string().describe('The text crawled from the initial pages.'),
});

export type AnalyzeWebsiteForSurveyInput = z.infer<typeof AnalyzeWebsiteForSurveyInputSchema>;
export type AnalyzeWebsiteForSurveyOutput = z.infer<typeof AnalyzeWebsiteForSurveyOutputSchema>;

export async function analyzeWebsiteForSurvey(input: AnalyzeWebsiteForSurveyInput): Promise<AnalyzeWebsiteForSurveyOutput> {
    return analyzeWebsiteForSurveyFlow(input);
}

const analyzeWebsiteForSurveyFlow = ai.defineFlow(
    {
        name: 'analyzeWebsiteForSurveyFlow',
        inputSchema: AnalyzeWebsiteForSurveyInputSchema,
        outputSchema: AnalyzeWebsiteForSurveyOutputSchema,
    },
    async (input: AnalyzeWebsiteForSurveyInput) => {
        const { url } = input;
        console.log(`[Phase 1] Starting quick scan and analysis for ${url}`);

        // Step 1: Perform an extremely fast, shallow scan of the homepage and its links
        const { crawledText, pageCount } = await quickScanFlow({ url });

        if (pageCount === 0 || !crawledText.trim()) {
            throw new Error('Could not extract any content from the initial pages of the website.');
        }

        // Step 2: Analyze the extracted content to understand the business basics
        const analysis = await analyzeWebsiteBasics({ crawledText });

        // Step 3: Generate tailored survey questions based on the initial analysis
        const { questions } = await generateTailoredSurveyQuestions({
            crawledText,
            analysis,
        });

        console.log(`[Phase 1] Completed. Generated ${questions.length} survey questions from ${pageCount} pages.`);

        return {
            questions,
            analysis,
            crawledText,
        };
    }
);