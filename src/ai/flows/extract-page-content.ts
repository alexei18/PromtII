'use server';
/**
 * @fileOverview A flow that extracts structured content from a given URL using a robust manual parsing method.
 *
 * - extractPageContent - A function that fetches a URL and extracts its content.
 * - ExtractPageContentInput - The input type for the extractPageContent function.
 * - ExtractPageContentOutput - The return type for the extractPageContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractPageContentInputSchema = z.object({
    url: z.string().describe('The URL to extract content from.'),
});
export type ExtractPageContentInput = z.infer<typeof ExtractPageContentInputSchema>;

const ExtractPageContentOutputSchema = z.object({
    url: z.string(),
    title: z.string().describe('The title of the page.'),
    metaDescription: z.string().describe('The meta description of the page.'),
    metaKeywords: z.string().describe('The meta keywords of the page.'),
    headings: z.array(z.object({
        level: z.number().min(1).max(6),
        text: z.string()
    })).describe('All headings (H1-H6) from the page with their levels.'),
    internalLinks: z.array(z.string()).describe('All internal links found on the page.'),
    externalLinks: z.array(z.string()).describe('All external links found on the page.'),
    imageAlts: z.array(z.string()).describe('All image alt texts found on the page.'),
    buttonTexts: z.array(z.string()).describe('All button texts found on the page.'),
    content: z.string().describe('The extracted main textual content of the page (for context).'),
});
export type ExtractPageContentOutput = z.infer<typeof ExtractPageContentOutputSchema>;


// Cached regular expressions for better performance
const REGEX_CACHE = {
    title: /<title>([^<]+)<\/title>/i,
    headings: /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    links: /<a\s+[^>]*href=["']([^"']+)["']/gi,
    images: /<img[^>]+alt=["']([^"']+)["'][^>]*>/gi,
    buttons: /<button[^>]*>([\s\S]*?)<\/button>/gi,
    scripts: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    styles: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    comments: /<!--[\s\S]*?-->/g
};

// Helper function to perform the extraction
async function performExtraction(url: string, html: string): Promise<ExtractPageContentOutput> {
    // Pre-clean the HTML to improve performance
    html = html
        .replace(REGEX_CACHE.comments, '') // Remove comments
        .replace(REGEX_CACHE.scripts, '') // Remove scripts
        .replace(REGEX_CACHE.styles, ''); // Remove styles

    const getTitle = (h: string) => h.match(REGEX_CACHE.title)?.[1].trim() || 'No title found';
    const getMetaTag = (h: string, name: string) => h.match(new RegExp(`<meta\\s+name=["']${name}["'][^>]*\\s+content=["'](.*?)["']`, 'i'))?.[1].trim() || '';

    const getHeadings = (h: string) => {
        const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
        const matches: { level: number, text: string }[] = [];
        let match;
        while ((match = headingRegex.exec(h)) !== null) {
            // Clean up inner HTML tags from heading content
            const cleanText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanText) {
                matches.push({ level: parseInt(match[1], 10), text: cleanText });
            }
        }
        return matches;
    }

    const getLinks = (h: string, baseUrl: string) => {
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
        const internalLinks: string[] = [];
        const externalLinks: string[] = [];
        const baseDomain = new URL(baseUrl).hostname;
        let match;
        while ((match = linkRegex.exec(h)) !== null) {
            try {
                const linkUrl = new URL(match[1], baseUrl); // Resolve relative URLs
                if (linkUrl.protocol !== 'http:' && linkUrl.protocol !== 'https:') continue;

                if (linkUrl.hostname.endsWith(baseDomain)) {
                    internalLinks.push(linkUrl.href);
                } else {
                    externalLinks.push(linkUrl.href);
                }
            } catch (e) {
                // Ignore invalid URLs like "mailto:" or "javascript:;"
            }
        }
        return { internalLinks: [...new Set(internalLinks)], externalLinks: [...new Set(externalLinks)] };
    }

    const getImageAlts = (h: string) => {
        const imgRegex = /<img[^>]+alt=["']([^"']+)["'][^>]*>/gi;
        const alts: string[] = [];
        let match;
        while ((match = imgRegex.exec(h)) !== null) {
            if (match[1]) { // Ensure alt text is not empty
                alts.push(match[1].trim());
            }
        }
        return alts;
    }

    const getButtonTexts = (h: string) => {
        const btnRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
        const texts: string[] = [];
        let match;
        while ((match = btnRegex.exec(h)) !== null) {
            const cleanText = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanText) {
                texts.push(cleanText);
            }
        }
        return texts;
    }

    // Optimized content extraction with cached regexes and better performance
    const CONTENT_CLEANUP = {
        mainContent: /<main[^>]*>([\s\S]*?)<\/main>/i,
        unwantedTags: /(?:<(nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>)|(?:<(script|style|head)\b[^<]*(?:(?!<\/\2>)<[^<]*)*<\/\2>)/gi,
        reviewSections: /<(?:div|section)[^>]+(class|id)=["'][^"']*(testimonial|review|rating)[^"']*["'][\s\S]*?<\/(?:div|section)>/gi,
        allTags: /<[^>]+>/g,
        multipleSpaces: /\s\s+/g
    };

    const getMainContent = (h: string) => {
        // First try to extract content from <main> tag
        let bodyContent = h;
        const mainMatch = h.match(CONTENT_CLEANUP.mainContent);
        if (mainMatch && mainMatch[1]) {
            bodyContent = mainMatch[1];
        }

        // Clean up the content in a single pass where possible
        bodyContent = bodyContent
            .replace(CONTENT_CLEANUP.unwantedTags, '') // Remove navigation, headers, footers, etc.
            .replace(CONTENT_CLEANUP.reviewSections, '') // Remove review sections
            .replace(CONTENT_CLEANUP.allTags, ' ') // Strip remaining HTML tags
            .replace(CONTENT_CLEANUP.multipleSpaces, ' ') // Clean up whitespace
            .trim();

        return bodyContent;
    }

    const content = getMainContent(html);
    const { internalLinks, externalLinks } = getLinks(html, url);

    return {
        url: url,
        title: getTitle(html),
        metaDescription: getMetaTag(html, 'description'),
        metaKeywords: getMetaTag(html, 'keywords'),
        headings: getHeadings(html),
        internalLinks: internalLinks,
        externalLinks: externalLinks,
        imageAlts: getImageAlts(html),
        buttonTexts: getButtonTexts(html),
        content: content.substring(0, 15000), // Increased context length
    };
}


export async function extractPageContent(input: ExtractPageContentInput): Promise<ExtractPageContentOutput> {
    return extractPageContentFlow(input);
}

const extractPageContentFlow = ai.defineFlow(
    {
        name: 'extractPageContentFlow',
        inputSchema: ExtractPageContentInputSchema,
        outputSchema: ExtractPageContentOutputSchema,
    },
    async (input: ExtractPageContentInput) => {
        const { url } = input;
        let response;
        let html;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                    'Accept-Language': 'en-US,en;q=0.9,ro;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: controller.signal
            }).finally(() => clearTimeout(timeout));

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('text/html')) {
                throw new Error('Not an HTML page');
            }

            html = await response.text();
        } catch (fetchError: any) {
            console.error(`Failed to fetch ${url}:`, fetchError.message);
            // Return a structured error object that matches the schema to avoid downstream issues.
            return {
                url: url,
                title: 'Error - Fetch Failed',
                metaDescription: '',
                metaKeywords: '',
                headings: [],
                internalLinks: [],
                externalLinks: [],
                imageAlts: [],
                buttonTexts: [],
                content: `Failed to fetch URL: ${fetchError.message}`,
            };
        }

        try {
            return await performExtraction(url, html);
        } catch (extractionError: any) {
            console.error(`Content extraction failed for ${url}:`, extractionError.message);
            return {
                url: url,
                title: 'Error - Extraction Failed',
                metaDescription: '',
                metaKeywords: '',
                headings: [],
                internalLinks: [],
                externalLinks: [],
                imageAlts: [],
                buttonTexts: [],
                content: `Failed to extract content: ${extractionError.message}`,
            };
        }
    }
);
