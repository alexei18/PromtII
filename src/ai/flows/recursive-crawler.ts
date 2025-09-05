'use server';

/**
 * @fileOverview A hybrid, sitemap-first recursive web crawler.
 * It prioritizes fetching URLs from sitemap.xml for completeness and speed,
 * falling back to traditional recursive crawling if a sitemap is not found.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RecursiveCrawlerInputSchema = z.object({
    url: z.string().describe('The URL to start crawling from.'),
    crawlDepth: z.number().min(1).max(4).default(2).describe('The maximum depth for the recursive fallback crawl.'),
    maxUrls: z.number().optional().describe('The maximum number of unique URLs to discover before stopping the crawl.'),
});
export type RecursiveCrawlerInput = z.infer<typeof RecursiveCrawlerInputSchema>;

const RecursiveCrawlerOutputSchema = z.object({
    urls: z.array(z.string()).describe('The list of URLs found during crawling.'),
});
export type RecursiveCrawlerOutput = z.infer<typeof RecursiveCrawlerOutputSchema>;

export async function recursiveCrawler(input: RecursiveCrawlerInput): Promise<RecursiveCrawlerOutput> {
    return recursiveCrawlerFlow(input);
}

// Helper function to fetch and parse sitemap.xml
async function fetchSitemap(url: string): Promise<Set<string>> {
    const sitemapUrl = new URL('/sitemap.xml', url).href;
    const foundUrls = new Set<string>();
    try {
        console.log(`[Sitemap] Attempting to fetch sitemap from: ${sitemapUrl}`);
        const response = await fetch(sitemapUrl, {
            // Folosim un User-Agent de browser pentru compatibilitate maximă
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (!response.ok) {
            console.warn(`[Sitemap] Sitemap not found or returned status ${response.status}.`);
            return foundUrls;
        }
        const sitemapText = await response.text();
        const urlRegex = /<loc>(.*?)<\/loc>/g;
        let match;
        while ((match = urlRegex.exec(sitemapText)) !== null) {
            foundUrls.add(match[1]);
        }
        console.log(`[Sitemap] Found ${foundUrls.size} URLs in sitemap.xml.`);
    } catch (error: any) {
        console.error(`[Sitemap] Error fetching or parsing sitemap: ${error.message}`);
    }
    return foundUrls;
}

const recursiveCrawlerFlow = ai.defineFlow(
    {
        name: 'recursiveCrawlerFlow',
        inputSchema: RecursiveCrawlerInputSchema,
        outputSchema: RecursiveCrawlerOutputSchema,
    },
    async (input: RecursiveCrawlerInput) => {
        const { url, crawlDepth, maxUrls } = input;
        const crawledUrls = new Set<string>();
        const discoveredUrls = new Set<string>();
        const rootUrl = new URL(url);
        const rootDomain = rootUrl.hostname.replace(/^www\./, '');

        // --- STRATEGIA 1: SITEMAP FIRST ---
        const sitemapUrls = await fetchSitemap(url);
        sitemapUrls.forEach(sitemapUrl => {
            try {
                const urlObj = new URL(sitemapUrl);
                const domain = urlObj.hostname.replace(/^www\./, '');
                if (domain.endsWith(rootDomain)) {
                    discoveredUrls.add(sitemapUrl);
                }
            } catch (e) { /* Ignoră URL-urile invalide din sitemap */ }
        });

        discoveredUrls.add(rootUrl.href);

        // --- STRATEGIA 2: FALLBACK RECURSIV ---
        if (discoveredUrls.size < 5) {
            console.log('[Crawler] Sitemap provided too few URLs. Starting recursive crawl as fallback.');
            const urlsToCrawl = new Set<string>([rootUrl.href]);

            for (let currentDepth = 0; currentDepth < crawlDepth; currentDepth++) {
                if (maxUrls && discoveredUrls.size >= maxUrls) break;

                const currentBatch = Array.from(urlsToCrawl).filter(u => !crawledUrls.has(u));
                urlsToCrawl.clear();

                if (currentBatch.length === 0) break;
                console.log(`[Crawler] Depth ${currentDepth + 1}: Processing ${currentBatch.length} URLs.`);

                const promises = currentBatch.map(async (currentUrl) => {
                    if (crawledUrls.has(currentUrl)) return;
                    crawledUrls.add(currentUrl);

                    try {
                        const response = await fetch(currentUrl, {
                            signal: AbortSignal.timeout(20000), // Timeout MĂRIT la 20 secunde
                            headers: {
                                // User-Agent GENERIC pentru compatibilitate
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml',
                            }
                        });

                        if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
                            return;
                        }

                        const html = await response.text();
                        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
                        let match;
                        while ((match = linkRegex.exec(html)) !== null) {
                            try {
                                const newUrl = new URL(match[1], currentUrl);
                                const newDomain = newUrl.hostname.replace(/^www\./, '');

                                if (newDomain.endsWith(rootDomain) && !newUrl.pathname.match(/\.(jpg|jpeg|png|gif|css|js|ico|xml|pdf|zip|doc)$/i)) {
                                    const cleanUrl = newUrl.origin + newUrl.pathname;
                                    if (!discoveredUrls.has(cleanUrl)) {
                                        discoveredUrls.add(cleanUrl);
                                        urlsToCrawl.add(cleanUrl);
                                    }
                                }
                            } catch (e) { /* Ignoră link-urile invalide */ }
                        }
                    } catch (error: any) {
                        console.error(`[Crawler] Error fetching ${currentUrl}: ${error.message}`);
                    }
                });

                await Promise.all(promises);
            }
        }

        const finalUrls = Array.from(discoveredUrls);
        console.log(`[Crawler] Discovery complete. Found a total of ${finalUrls.length} unique URLs.`);

        return { urls: maxUrls ? finalUrls.slice(0, maxUrls) : finalUrls };
    }
);