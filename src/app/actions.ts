'use server';

import { z } from 'zod';
import { recursiveCrawler } from '@/ai/flows/recursive-crawler';
import { extractPageContent, type ExtractPageContentOutput } from '@/ai/flows/extract-page-content';
import { constructTailoredSystemPrompt } from '@/ai/flows/generate-ai-prompt';
import { generateTailoredSurveyQuestions } from '@/ai/flows/generate-survey-questions';
import { analyzeWebsiteBasics } from '@/ai/flows/analyze-website-basics';
import { testPrompt } from '@/ai/flows/test-prompt';
import { generatePersonaCard } from '@/ai/flows/generate-persona-card';
import type { WebsiteAnalysis, PersonaCardData, ChatMessage } from '@/lib/types';

export async function crawlAndExtractAction(url: string): Promise<string> {
  console.log(`Starting crawl for: ${url}`);
  const { urls } = await recursiveCrawler({ url, crawlDepth: 4 }); // Increased depth
  console.log(`Found ${urls.length} URLs to process.`);

  if (urls.length === 0) {
    throw new Error('The crawler could not find any URLs. Please check the URL and try again.');
  }

  // Increased batch size and max URLs
  const batchSize = 50; // Process more URLs at once
  const allResults = [];
  const maxUrls = 200; // Increased from 90

  // Sort URLs by relevance (shorter paths first, as they're often more important)
  const sortedUrls = [...urls].sort((a, b) => {
    const aPath = new URL(a).pathname;
    const bPath = new URL(b).pathname;
    return aPath.split('/').length - bPath.split('/').length;
  });

  for (let i = 0; i < sortedUrls.length; i += batchSize) {
    const urlBatch = sortedUrls.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(sortedUrls.length / batchSize)} (${urlBatch.length} URLs)`);

    const extractionPromises = urlBatch.map(foundUrl => extractPageContent({ url: foundUrl }));
    const batchResults = await Promise.all(extractionPromises);
    const successfulBatchResults = batchResults.filter(result => result && !result.title.includes('Error'));
    allResults.push(...successfulBatchResults);

    // Continue until we reach the new maximum
    if (allResults.length >= maxUrls) {
      console.log(`Reached maximum desired URLs (${maxUrls}), stopping further processing`);
      break;
    }
  }

  const successfulResults = allResults;

  if (successfulResults.length === 0) {
    // Only throw an error if ALL processing fails.
    console.error("All URL processing attempts failed.", { allResults });
    throw new Error(`Failed to extract content from the provided URL. Please ensure the URL is correct and the site is publicly accessible.`);
  }

  const combinedText = successfulResults.map(result => {
    return `
    --- START PAGE: ${result.url} ---
    ${result.content}
    --- END PAGE: ${result.url} ---
    `;
  }).join('\n\n');

  console.log(`Extraction and analysis complete for ${successfulResults.length} pages. Total characters: ${combinedText.length}`);
  return combinedText;
}

export async function analyzeWebsiteAction(params: { crawledText: string }): Promise<WebsiteAnalysis> {
  console.log('Analyzing website basics...');
  const result = await analyzeWebsiteBasics({ crawledText: params.crawledText });
  console.log('Website analysis successful.');
  return result;
}

export async function generateSurveyAction(params: { crawledText: string; analysis: WebsiteAnalysis }) {
  console.log('Generating survey questions...');
  const result = await generateTailoredSurveyQuestions({
    crawledText: params.crawledText,
    analysis: params.analysis,
  });
  console.log('Survey generation successful.');
  return result;
}


export async function generatePromptFromSurveyAction(params: {
  surveyResponses: Record<string, string>;
  crawledText: string;
  analysis: WebsiteAnalysis;
}) {
  console.log('Generating prompt from survey...');

  const result = await constructTailoredSystemPrompt({
    formResponses: params.surveyResponses,
    crawledText: params.crawledText,
    analysis: params.analysis,
  });

  console.log('Prompt generation successful.');
  return result;
}

export async function testPromptAction(params: { systemPrompt: string, userMessage: string, history: ChatMessage[] }): Promise<string> {
  console.log('Testing prompt in sandbox...');
  const result = await testPrompt(params);
  console.log('Sandbox test successful.');
  return result.response;
}

export async function generatePersonaCardAction(params: { context: string }): Promise<PersonaCardData> {
  console.log('Generating persona card...');
  const result = await generatePersonaCard(params);
  console.log('Persona card generation successful.');
  return result;
}
