'use server';

/**
 * @fileOverview A flow that performs an extremely fast, shallow scan of a website's homepage and its immediate links.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { extractPageContent, type ExtractPageContentOutput } from './extract-page-content';

const QuickScanInputSchema = z.object({
    url: z.string().describe('The URL to perform a quick scan on.'),
});

const QuickScanOutputSchema = z.object({
    crawledText: z.string().describe('The combined text content from the scanned pages.'),
    pageCount: z.number().describe('The number of pages successfully extracted.'),
});

export type QuickScanInput = z.infer<typeof QuickScanInputSchema>;
export type QuickScanOutput = z.infer<typeof QuickScanOutputSchema>;

export async function quickScan(input: QuickScanInput): Promise<QuickScanOutput> {
    return quickScanFlow(input);
}

export const quickScanFlow = ai.defineFlow(
    {
        name: 'quickScanFlow',
        inputSchema: QuickScanInputSchema,
        outputSchema: QuickScanOutputSchema,
    },
    async (input: QuickScanInput) => {
        const { url } = input;
        console.log(`[Quick Scan] Starting for entry URL: ${url}`);
        const MAX_PAGES = 5;
        const allPageContents: ExtractPageContentOutput[] = [];

        // 1. Fetch the main entry URL (homepage)
        const homePageData = await extractPageContent({ url });
        if (homePageData && !homePageData.title.startsWith('Error')) {
            allPageContents.push(homePageData);
        } else {
            throw new Error(`[Quick Scan] Failed to fetch the main URL: ${url}. Cannot proceed.`);
        }

        // 2. Gather up to 4 more unique, internal links directly from the homepage
        const discoveredUrls = new Set<string>([url]);
        const additionalUrls: string[] = [];

        for (const link of homePageData.internalLinks) {
            if (additionalUrls.length >= MAX_PAGES - 1) break;
            if (!discoveredUrls.has(link) && !link.match(/\.(pdf|jpg|jpeg|png|gif|css|js|xml|ico)$/i)) {
                discoveredUrls.add(link);
                additionalUrls.push(link);
            }
        }

        console.log(`[Quick Scan] Found ${additionalUrls.length} additional valid URLs to process from homepage.`);

        // 3. Fetch the additional pages in parallel
        if (additionalUrls.length > 0) {
            const additionalPagePromises = additionalUrls.map(pageUrl => extractPageContent({ url: pageUrl }));
            const settledPages = await Promise.allSettled(additionalPagePromises);

            settledPages.forEach(result => {
                if (result.status === 'fulfilled' && result.value && !result.value.title.startsWith('Error')) {
                    allPageContents.push(result.value);
                }
            });
        }

        // 4. Combine the text content
        const crawledText = allPageContents
            .map(page => `--- START PAGE: ${page.url} ---\nTitle: ${page.title}\nContent:\n${page.content}\n--- END PAGE ---\n\n`)
            .join('');

        console.log(`[Quick Scan] Successfully extracted content from ${allPageContents.length} pages.`);

        return {
            crawledText,
            pageCount: allPageContents.length,
        };
    }
);