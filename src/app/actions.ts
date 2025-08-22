'use server';

import { z } from 'zod';
import { runFlow } from '@genkit-ai/flow';
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
    throw new Error(`Prea multe cereri. Te rugăm să aștepți ${waitTime} secunde înainte să încerci din nou.`);
  }
  
  console.log(`[ACTION] Starting PHASE 1: Quick scan for ${url}. Rate limit: ${rateLimitResult.remaining} requests remaining.`);
  const result = await analyzeWebsiteForSurvey({ url });
  console.log(`[ACTION] PHASE 1 complete. Returning survey questions and analysis.`);
  return {
    questions: result.questions,
    analysis: result.analysis,
    initialCrawledText: result.crawledText,
  };
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
    const { crawledText, pageCount } = await crawlAndExtractContent({
      url,
      maxPages: 100,
      crawlDepth: 3,
    });
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
    throw new Error(`Prea multe cereri. Te rugăm să aștepți ${waitTime} secunde înainte să încerci din nou.`);
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

    // Construim prompt-ul final cu textul optimizat
    const { finalPrompt } = await constructTailoredSystemPrompt({
      formResponses: params.surveyResponses,
      crawledText: textToUse,
      analysis: finalAnalysis, // Folosim cea mai recentă și precisă analiză
      quickSurveyResponses: params.quickSurveyResponses,
    });

    // Generăm cardul de personalitate
    const personaCard = await generatePersonaCard({ context: finalPrompt });

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
    const newPrompt = await runFlow(regeneratePromptWithKnowledgeFlow, {
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
