'use server';

/**
 * @fileOverview A recursive web crawler Genkit flow. Allows users to specify the crawl depth and a maximum number of URLs to find.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecursiveCrawlerInputSchema = z.object({
    url: z.string().describe('The URL to start crawling from.'),
    crawlDepth: z.number().min(1).max(4).default(1).describe('The maximum depth to crawl. Must be between 1 and 4.'),
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

const recursiveCrawlerFlow = ai.defineFlow(
    {
        name: 'recursiveCrawlerFlow',
        inputSchema: RecursiveCrawlerInputSchema,
        outputSchema: RecursiveCrawlerOutputSchema,
    },
    async input => {
        const { url, crawlDepth, maxUrls } = input;
        const crawledUrls = new Set<string>();
        const discoveredUrls = new Set<string>();
        const urlsByDepth = new Map<number, Set<string>>();
        const rootUrl = new URL(url);
        const rootDomain = rootUrl.hostname.replace(/^www\./, '');
        const MAX_CONCURRENT_REQUESTS = 10;
        const MAX_URLS_PER_DEPTH = 200;

        for (let i = 0; i <= crawlDepth; i++) {
            urlsByDepth.set(i, new Set<string>());
        }

        urlsByDepth.get(0)?.add(rootUrl.href);
        discoveredUrls.add(rootUrl.href);

        const extractLinks = (html: string, baseUrl: string): string[] => {
            const links = new Set<string>();
            const baseUrlObj = new URL(baseUrl);

            const hrefMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi);
            for (const match of hrefMatches) {
                if (match[1]) links.add(match[1]);
            }

            const clickMatches = html.matchAll(/onClick=["'][^"']*?(?:location\.href|window\.location)[^"']*?["']([^"']+)["']/gi);
            for (const match of clickMatches) {
                if (match[1]) links.add(match[1]);
            }

            const dataMatches = html.matchAll(/data-(?:href|url|link|route)=["']([^"']+)["']/gi);
            for (const match of dataMatches) {
                if (match[1]) links.add(match[1]);
            }

            const menuMatches = html.matchAll(/(?:data-menu|data-target|data-section)=["']([^"']+)["']/gi);
            for (const match of menuMatches) {
                if (match[1]) {
                    if (match[1].startsWith('#')) {
                        links.add(`${baseUrlObj.origin}${baseUrlObj.pathname}${match[1]}`);
                    } else {
                        links.add(match[1]);
                    }
                }
            }

            const languageMatches = html.matchAll(/\/(?:ro|ru|en|md)\//g);
            for (const match of languageMatches) {
                if (match[0]) {
                    const langPath = baseUrlObj.pathname.replace(/^\/(?:ro|ru|en|md)\//, '/');
                    links.add(`${baseUrlObj.origin}${match[0]}${langPath}`);
                }
            }

            return Array.from(links).map(link => {
                try {
                    if (link.startsWith('#')) {
                        return `${baseUrlObj.origin}${baseUrlObj.pathname}${link}`;
                    }
                    const absoluteUrl = new URL(link, baseUrlObj.origin);
                    absoluteUrl.search = '';
                    return absoluteUrl.href;
                } catch {
                    return link;
                }
            });
        };

        for (let currentDepth = 0; currentDepth < crawlDepth; currentDepth++) {
            if (maxUrls && crawledUrls.size >= maxUrls) {
                console.log(`Max URL limit (${maxUrls}) reached. Stopping crawl.`);
                break;
            }

            const currentUrls = Array.from(urlsByDepth.get(currentDepth) || new Set<string>());
            console.log(`Processing depth ${currentDepth + 1}, found ${currentUrls.length} URLs to check.`);

            const urlBatches = currentUrls.reduce((acc, _, i) => {
                if (i % MAX_CONCURRENT_REQUESTS === 0) {
                    acc.push(currentUrls.slice(i, i + MAX_CONCURRENT_REQUESTS));
                }
                return acc;
            }, [] as string[][]);

            for (const batch of urlBatches) {
                if (maxUrls && crawledUrls.size >= maxUrls) {
                    break;
                }

                await Promise.all(batch.map(async (currentUrl) => {
                    if (crawledUrls.has(currentUrl) || (maxUrls && crawledUrls.size >= maxUrls)) return;

                    try {
                        const currentUrlObj = new URL(currentUrl);
                        const currentDomain = currentUrlObj.hostname.replace(/^www\./, '');

                        if (!currentDomain.endsWith(rootDomain)) return;
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

                            const links = extractLinks(html, currentUrl);
                            const nextDepth = currentDepth + 1;

                            for (const link of links) {
                                try {
                                    const linkUrl = new URL(link, currentUrlObj.origin);
                                    const linkDomain = linkUrl.hostname.replace(/^www\./, '');
                                    if (!linkDomain.endsWith(rootDomain)) continue;

                                    linkUrl.hash = '';
                                    linkUrl.search = '';
                                    const cleanUrl = linkUrl.href;

                                    if (discoveredUrls.has(cleanUrl)) continue;

                                    if (nextDepth < crawlDepth) {
                                        const depthUrls = urlsByDepth.get(nextDepth);
                                        if (depthUrls && depthUrls.size < MAX_URLS_PER_DEPTH) {
                                            depthUrls.add(cleanUrl);
                                            discoveredUrls.add(cleanUrl);
                                        }
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                        } catch (error: any) {
                            console.error(`Error fetching ${currentUrl}: ${error.message}`);
                        }
                    } catch (error: any) {
                        console.error(`Error processing ${currentUrl}: ${error.message}`);
                    }
                }));
            }
            console.log(`Completed depth ${currentDepth + 1}, total URLs crawled: ${crawledUrls.size}, discovered: ${discoveredUrls.size}`);
        }

        return { urls: Array.from(crawledUrls).slice(0, maxUrls) };
    }
);