'use server';

/**
 * @fileOverview A recursive web crawler Genkit flow. Allows users to specify the crawl depth.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecursiveCrawlerInputSchema = z.object({
    url: z.string().describe('The URL to start crawling from.'),
    crawlDepth: z.number().min(1).max(4).default(1).describe('The maximum depth to crawl. Must be between 1 and 4.'),
});
export type RecursiveCrawlerInput = z.infer<typeof RecursiveCrawlerInputSchema>;

const RecursiveCrawlerOutputSchema = z.object({
    urls: z.array(z.string()).describe('The list of URLs found during crawling.'),
});
export type RecursiveCrawlerOutput = z.infer<typeof RecursiveCrawlerOutputSchema>;

export async function recursiveCrawler(input: RecursiveCrawlerInput): Promise<RecursiveCrawlerOutput> {
    return recursiveCrawlerFlow(input);
}

const recursiveCrawlerFlow = ai.defineFlow(
    {
        name: 'recursiveCrawlerFlow',
        inputSchema: RecursiveCrawlerInputSchema,
        outputSchema: RecursiveCrawlerOutputSchema,
    },
    async input => {
        const { url, crawlDepth } = input;
        const crawledUrls = new Set<string>();
        const discoveredUrls = new Set<string>();
        const urlsByDepth = new Map<number, Set<string>>();
        const rootUrl = new URL(url);
        const rootDomain = rootUrl.hostname.replace(/^www\./, '');
        const MAX_CONCURRENT_REQUESTS = 10;
        const MAX_URLS_PER_DEPTH = 200;

        // Initialize URL sets for each depth level
        for (let i = 0; i <= crawlDepth; i++) {
            urlsByDepth.set(i, new Set<string>());
        }

        // Add the root URL to depth 0
        urlsByDepth.get(0)?.add(rootUrl.href);
        discoveredUrls.add(rootUrl.href);

        // Enhanced link extractor that handles SPAs and dynamic content
        const extractLinks = (html: string, baseUrl: string): string[] => {
            const links = new Set<string>();
            const baseUrlObj = new URL(baseUrl);

            // Extract regular links
            const hrefMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi);
            for (const match of hrefMatches) {
                if (match[1]) links.add(match[1]);
            }

            // Extract onclick navigation
            const clickMatches = html.matchAll(/onClick=["'][^"']*?(?:location\.href|window\.location)[^"']*?["']([^"']+)["']/gi);
            for (const match of clickMatches) {
                if (match[1]) links.add(match[1]);
            }

            // Extract data attributes commonly used in SPAs
            const dataMatches = html.matchAll(/data-(?:href|url|link|route)=["']([^"']+)["']/gi);
            for (const match of dataMatches) {
                if (match[1]) links.add(match[1]);
            }

            // Handle various types of menu links
            const menuMatches = html.matchAll(/(?:data-menu|data-target|data-section)=["']([^"']+)["']/gi);
            for (const match of menuMatches) {
                if (match[1]) {
                    // If it's a hash link, prepend the base URL
                    if (match[1].startsWith('#')) {
                        links.add(`${baseUrlObj.origin}${baseUrlObj.pathname}${match[1]}`);
                    } else {
                        links.add(match[1]);
                    }
                }
            }

            // Handle language switcher links
            const languageMatches = html.matchAll(/\/(?:ro|ru|en|md)\//g);
            for (const match of languageMatches) {
                if (match[0]) {
                    const langPath = baseUrlObj.pathname.replace(/^\/(?:ro|ru|en|md)\//, '/');
                    links.add(`${baseUrlObj.origin}${match[0]}${langPath}`);
                }
            }

            // Process and normalize links
            return Array.from(links).map(link => {
                try {
                    // Handle hash-only links for SPAs
                    if (link.startsWith('#')) {
                        return `${baseUrlObj.origin}${baseUrlObj.pathname}${link}`;
                    }
                    // Normalize relative links
                    const absoluteUrl = new URL(link, baseUrlObj.origin);
                    // Remove query parameters that don't affect content
                    absoluteUrl.search = '';
                    return absoluteUrl.href;
                } catch {
                    return link; // Keep original if URL parsing fails
                }
            });
        };

        // Process URLs level by level (breadth-first)
        for (let currentDepth = 0; currentDepth < crawlDepth; currentDepth++) {
            const currentUrls = urlsByDepth.get(currentDepth) || new Set<string>();
            console.log(`Processing depth ${currentDepth + 1}, found ${currentUrls.size} URLs`);

            // Create batches for concurrent processing
            const urlBatches = Array.from(currentUrls).reduce((acc, _, i) => {
                if (i % MAX_CONCURRENT_REQUESTS === 0) {
                    acc.push(Array.from(currentUrls).slice(i, i + MAX_CONCURRENT_REQUESTS));
                }
                return acc;
            }, [] as string[][]);

            for (const batch of urlBatches) {
                await Promise.all(batch.map(async (currentUrl) => {
                    if (crawledUrls.has(currentUrl)) return;

                    try {
                        const currentUrlObj = new URL(currentUrl);
                        const currentDomain = currentUrlObj.hostname.replace(/^www\./, '');

                        // Skip non-internal URLs
                        if (!currentDomain.endsWith(rootDomain)) return;

                        // Skip non-content URLs
                        if (currentUrlObj.pathname.match(/\.(jpg|jpeg|png|gif|css|js|ico|xml|pdf|zip|doc|docx)$/i)) return;

                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 20000);

                        try {
                            const response = await fetch(currentUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.5,ro;q=0.3,ru;q=0.2',
                                    'Cache-Control': 'no-cache'
                                },
                                signal: controller.signal
                            });

                            clearTimeout(timeout);

                            if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
                                return;
                            }

                            const html = await response.text();
                            crawledUrls.add(currentUrl);

                            // Extract and process links from the page
                            const links = extractLinks(html, currentUrl);

                            // Process discovered links
                            for (const link of links) {
                                try {
                                    const linkUrl = new URL(link, currentUrlObj.origin);
                                    const linkDomain = linkUrl.hostname.replace(/^www\./, '');

                                    // Only process internal links
                                    if (!linkDomain.endsWith(rootDomain)) continue;

                                    // Clean up the URL
                                    linkUrl.hash = '';
                                    linkUrl.search = '';
                                    const cleanUrl = linkUrl.href;

                                    // Skip if already discovered
                                    if (discoveredUrls.has(cleanUrl)) continue;

                                    // Add to next depth level
                                    const nextDepth = currentDepth + 1;
                                    if (nextDepth < crawlDepth) {
                                        const depthUrls = urlsByDepth.get(nextDepth);
                                        if (depthUrls && depthUrls.size < MAX_URLS_PER_DEPTH) {
                                            depthUrls.add(cleanUrl);
                                            discoveredUrls.add(cleanUrl);
                                        }
                                    }
                                } catch (e) {
                                    // Skip invalid URLs
                                    continue;
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching ${currentUrl}: ${error.message}`);
                        }
                    } catch (error) {
                        console.error(`Error processing ${currentUrl}: ${error.message}`);
                    }
                }));
            }

            console.log(`Completed depth ${currentDepth + 1}, total URLs discovered: ${discoveredUrls.size}`);
        }

        return { urls: Array.from(crawledUrls) };
    }
);
