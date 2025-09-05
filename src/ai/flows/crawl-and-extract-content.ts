'use server';

/**
 * @fileOverview A flow that crawls a website to a specified depth and extracts the content from each page.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { recursiveCrawler } from './recursive-crawler';
import { extractPageContent } from './extract-page-content';

const CrawlAndExtractInputSchema = z.object({
    url: z.string().describe('The URL to start crawling from.'),
    maxPages: z.number().min(1).max(100).default(10).describe('The maximum number of pages to crawl and extract.'),
    crawlDepth: z.number().min(1).max(4).default(2).describe('The maximum depth to crawl.'),
});

const CrawlAndExtractOutputSchema = z.object({
    crawledText: z.string().describe('The combined text content from all extracted pages.'),
    pageCount: z.number().describe('The number of pages successfully extracted.'),
});

export type CrawlAndExtractInput = z.infer<typeof CrawlAndExtractInputSchema>;
export type CrawlAndExtractOutput = z.infer<typeof CrawlAndExtractOutputSchema>;

export async function crawlAndExtractContent(input: CrawlAndExtractInput): Promise<CrawlAndExtractOutput> {
    return crawlAndExtractContentFlow(input);
}

export const crawlAndExtractContentFlow = ai.defineFlow(
    {
        name: 'crawlAndExtractContentFlow',
        inputSchema: CrawlAndExtractInputSchema,
        outputSchema: CrawlAndExtractOutputSchema,
    },
    async (input: CrawlAndExtractInput) => {
        const { url, maxPages, crawlDepth } = input;
        console.log(`Starting crawl for ${url} with depth ${crawlDepth} and max pages ${maxPages}`);

        // Pass maxPages to the new maxUrls parameter to stop the crawler early.
        const { urls } = await recursiveCrawler({ url, crawlDepth, maxUrls: maxPages });

        // The slicing here is now mostly a safeguard, as the crawler itself should stop early.
        const uniqueUrls = Array.from(new Set(urls)).slice(0, maxPages);
        console.log(`Found ${uniqueUrls.length} unique URLs to extract.`);

        const extractionPromises = uniqueUrls.map(pageUrl => extractPageContent({ url: pageUrl }));
        const extractedPages = await Promise.all(extractionPromises);

        const successfulPages = extractedPages.filter(page => page && !page.title.startsWith('Error'));

        const crawledText = successfulPages
            .map(page => `--- START PAGE: ${page.url} ---\nTitle: ${page.title}\nContent:\n${page.content}\n--- END PAGE ---\n\n`)
            .join('');

        console.log(`Successfully extracted content from ${successfulPages.length} pages.`);

        return {
            crawledText,
            pageCount: successfulPages.length,
        };
    }
);