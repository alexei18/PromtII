'use server';

import { z } from 'zod';
import { headers } from 'next/headers';

// Importăm fluxurile de orchestrare și cele de bază
import { analyzeWebsiteForSurvey } from '@/ai/flows/analyze-website-for-survey';
import { crawlAndExtractContent } from '@/ai/flows/crawl-and-extract-content';
import { constructTailoredSystemPrompt } from '@/ai/flows/generate-ai-prompt';
import { analyzeWebsiteBasics } from '@/ai/flows/analyze-website-basics';
import { testPrompt } from '@/ai/flows/test-prompt';
import { generatePersonaCard } from '@/ai/flows/generate-persona-card';
import { generateTailoredSurveyQuestions } from '@/ai/flows/generate-survey-questions';
import { regeneratePromptWithKnowledgeFlow } from '@/ai/flows/regenerate-prompt-with-knowledge';

// Importăm utilitarele pentru optimizare
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limiter';
import { optimizeTextForAI, logTextOptimization } from '@/lib/text-optimizer';
import { withTimeout, withRetry, optimizeForProduction, TIMEOUT_CONFIGS } from '@/lib/timeout-manager';
import { profiler, enableLocalDebugging, profileAction } from '@/lib/performance-profiler';

// Enable debugging în development
if (process.env.NODE_ENV === 'development') {
  enableLocalDebugging();
}


// Importăm tipurile necesare
import type { WebsiteAnalysis, PersonaCardData, ChatMessage, SurveyQuestion, QuickSurveyData } from '@/lib/types';
import { WebsiteAnalysisSchema } from '@/lib/types';

// Schema for the file data coming from the client
const FileDataSchema = z.object({
  content: z.string(), // base64
  type: z.string(),
});


// ACȚIUNEA PENTRU FAZA 1 - Analiza rapidă a site-ului
export async function startInitialAnalysisAction(url: string): Promise<{
  questions: SurveyQuestion[];
  analysis: WebsiteAnalysis;
  initialCrawledText: string;
}> {
  // Rate limiting check
  const headersList = await headers();
  const clientId = getClientIdentifier(headersList);
  const rateLimitResult = checkRateLimit(clientId);

  if (!rateLimitResult.allowed) {
    const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    throw new Error(`Ai făcut prea multe cereri rapid. Te rugăm să aștepți ${waitTime} secunde pentru a continua.`);
  }

  console.log(`[ACTION] Starting PHASE 1: Quick scan for ${url}. Rate limit: ${rateLimitResult.remaining} requests remaining.`);

  try {
    // Aplicăm timeout pentru toată operația Phase 1
    const result = await withTimeout(
      analyzeWebsiteForSurvey({ url }),
      TIMEOUT_CONFIGS.PHASE_1_ANALYSIS,
      'Phase 1 Analysis'
    );

    console.log(`[ACTION] PHASE 1 complete. Returning survey questions and analysis.`);
    return {
      questions: result.questions,
      analysis: result.analysis,
      initialCrawledText: result.crawledText,
    };
  } catch (error: any) {
    console.error('[ACTION] Phase 1 failed:', error.message);
    throw new Error(`Analiza inițială a eșuat: ${error.message}`);
  }
}

// NOU: ACȚIUNE PENTRU FAZA 1 - Când utilizatorul NU are website
export async function generateSurveyWithoutWebsiteAction(manualAnalysis: WebsiteAnalysis): Promise<{
  questions: SurveyQuestion[];
}> {
  console.log(`[ACTION] Starting PHASE 1: No website flow.`);
  // Generăm întrebări direct pe baza analizei manuale
  const { questions } = await generateTailoredSurveyQuestions({
    analysis: manualAnalysis,
    crawledText: '', // Nu avem conținut de pe site
  });
  console.log(`[ACTION] PHASE 1 (No website) complete. Returning survey questions.`);
  return { questions };
}

// ACȚIUNE PENTRU CRAWL-UL DE FUNDAL (Faza 2 - Partea 1)
export async function performDeepCrawlAction(url: string): Promise<string> {
  console.log(`[ACTION][BACKGROUND] Starting deep crawl for ${url}`);
  try {
    // Aplicăm timeout pentru deep crawl
    const { crawledText, pageCount } = await withTimeout(
      crawlAndExtractContent({
        url,
        maxPages: 100,
        crawlDepth: 3,
      }),
      TIMEOUT_CONFIGS.DEEP_CRAWL,
      'Deep Website Crawl'
    );

    console.log(`[ACTION][BACKGROUND] Deep crawl finished. Extracted ${pageCount} pages.`);
    return crawledText;
  } catch (error: any) {
    console.error(`[ACTION][BACKGROUND] Deep crawl failed:`, error.message);
    throw new Error(`The deep website analysis failed. ${error.message}`);
  }
}

// ACȚIUNE MODIFICATĂ: Pentru generarea prompt-ului final (Faza 2 - Partea 2)
// Acum primește textul extras și analiza inițială (manuală sau automată)
export async function generateFinalPromptAction(params: {
  surveyResponses: Record<string, string>;
  deepCrawledText: string | null; // Poate fi null dacă s-a sărit peste pasul cu URL
  initialAnalysis: WebsiteAnalysis; // Analiza inițială, confirmată sau introdusă manual
  quickSurveyResponses: QuickSurveyData;
}): Promise<{ finalPrompt: string; personaCard: PersonaCardData }> {
  // Rate limiting check
  const headersList = await headers();
  const clientId = getClientIdentifier(headersList);
  const rateLimitResult = checkRateLimit(clientId);

  if (!rateLimitResult.allowed) {
    const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    throw new Error(`Ai făcut prea multe cereri rapid. Te rugăm să aștepți ${waitTime} secunde pentru a continua.`);
  }

  console.log(`[ACTION] Starting final prompt generation. Rate limit: ${rateLimitResult.remaining} requests remaining.`);

  try {
    let finalAnalysis = params.initialAnalysis;
    let textToUse = params.deepCrawledText || '';

    // Optimizăm textul pentru a reduce consumul de token-uri
    if (params.deepCrawledText) {
      const originalText = params.deepCrawledText;
      const optimizedText = optimizeTextForAI(originalText);
      logTextOptimization(originalText, optimizedText);
      textToUse = optimizedText;

      console.log('[ACTION] Re-analyzing with optimized deep-crawled text for higher accuracy.');
      finalAnalysis = await analyzeWebsiteBasics({ crawledText: optimizedText });
    }

    // Aplicăm timeout pentru generarea promptului final
    const { finalPrompt } = await withTimeout(
      constructTailoredSystemPrompt({
        formResponses: params.surveyResponses,
        crawledText: textToUse,
        analysis: finalAnalysis,
        quickSurveyResponses: params.quickSurveyResponses,
      }),
      TIMEOUT_CONFIGS.AI_GENERATION,
      'System Prompt Generation'
    );

    // Generăm cardul de personalitate cu timeout
    const personaCard = await withTimeout(
      generatePersonaCard({ context: finalPrompt }),
      TIMEOUT_CONFIGS.AI_GENERATION,
      'Persona Card Generation'
    );

    console.log('[ACTION] Final prompt and persona card generated successfully.');
    return { finalPrompt, personaCard };

  } catch (error: any) {
    console.error('[ACTION] Error during final prompt generation:', error.message);
    throw new Error(`Failed to generate the final prompt. ${error.message}`);
  }
}

/**
 * Regenerates the system prompt by incorporating a user-uploaded knowledge base.
 * @param currentPrompt The existing system prompt.
 * @param fileData The file object containing content (base64) and type.
 * @returns The new, updated system prompt.
 */
export async function regeneratePromptWithKnowledgeBaseAction(
  currentPrompt: string,
  fileData: z.infer<typeof FileDataSchema>
): Promise<string> {
  console.log(`[Action] Received request to regenerate prompt with file.`);

  const validatedCurrentPrompt = z.string().min(1).parse(currentPrompt);
  const validatedFileData = FileDataSchema.parse(fileData);

  try {
    // Apelăm direct flow-ul în loc să folosim runFlow
    const newPrompt = await regeneratePromptWithKnowledgeFlow({
      currentPrompt: validatedCurrentPrompt,
      file: validatedFileData,
    });
    return newPrompt;
  } catch (error: any) {
    console.error('[Action] Error running regeneratePromptWithKnowledgeFlow:', error);
    throw new Error(error.message || 'An unexpected error occurred during prompt regeneration.');
  }
}


// Acțiunile utilitare rămân neschimbate
export async function testPromptAction(params: { systemPrompt: string, userMessage: string, history: ChatMessage[] }): Promise<string> {
  console.log('[ACTION] Testing prompt in sandbox...');
  const result = await testPrompt(params);
  console.log('[ACTION] Sandbox test successful.');
  return result.response;
}

export async function generatePersonaCardAction(params: { context: string }): Promise<PersonaCardData> {
  console.log('[ACTION] Generating persona card...');
  const result = await generatePersonaCard(params);
  console.log('[ACTION] Persona card generation successful.');
  return result;
}
