'use server';

import { z } from 'zod';

// Importăm fluxurile de orchestrare și cele de bază
import { analyzeWebsiteForSurvey } from '@/ai/flows/analyze-website-for-survey';
import { crawlAndExtractContent } from '@/ai/flows/crawl-and-extract-content';
import { constructTailoredSystemPrompt } from '@/ai/flows/generate-ai-prompt';
import { analyzeWebsiteBasics } from '@/ai/flows/analyze-website-basics';
import { testPrompt } from '@/ai/flows/test-prompt';
import { generatePersonaCard } from '@/ai/flows/generate-persona-card';

// Importăm tipurile necesare
import type { WebsiteAnalysis, PersonaCardData, ChatMessage, SurveyQuestion } from '@/lib/types';

// ACȚIUNEA PENTRU FAZA 1 - Rămâne neschimbată
export async function startInitialAnalysisAction(url: string): Promise<{
  questions: SurveyQuestion[];
  analysis: WebsiteAnalysis;
  initialCrawledText: string;
}> {
  console.log(`[ACTION] Starting PHASE 1: Quick scan for ${url}`);
  const result = await analyzeWebsiteForSurvey({ url });
  console.log(`[ACTION] PHASE 1 complete. Returning survey questions.`);
  return {
    questions: result.questions,
    analysis: result.analysis,
    initialCrawledText: result.crawledText,
  };
}

// ACȚIUNE NOUĂ: Doar pentru crawl-ul de fundal (Faza 2 - Partea 1)
export async function performDeepCrawlAction(url: string): Promise<string> {
  console.log(`[ACTION][BACKGROUND] Starting deep crawl for ${url}`);
  try {
    const { crawledText, pageCount } = await crawlAndExtractContent({
      url,
      maxPages: 50, // Parametri pentru un crawl detaliat
      crawlDepth: 2,
    });
    console.log(`[ACTION][BACKGROUND] Deep crawl finished. Extracted ${pageCount} pages.`);
    return crawledText;
  } catch (error: any) {
    console.error(`[ACTION][BACKGROUND] Deep crawl failed:`, error.message);
    throw new Error(`The deep website analysis failed. ${error.message}`);
  }
}

// ACȚIUNE MODIFICATĂ: Pentru generarea prompt-ului (Faza 2 - Partea 2)
// Acum primește textul deja extras
export async function generateFinalPromptAction(params: {
  surveyResponses: Record<string, string>;
  deepCrawledText: string;
}): Promise<{ finalPrompt: string; personaCard: PersonaCardData }> {
  console.log(`[ACTION] Starting final prompt generation with deep-crawled text.`);
  try {
    // 1. Re-analizăm pe baza textului complet pentru acuratețe maximă
    const fullAnalysis = await analyzeWebsiteBasics({ crawledText: params.deepCrawledText });

    // 2. Construim prompt-ul
    const { finalPrompt } = await constructTailoredSystemPrompt({
      formResponses: params.surveyResponses,
      crawledText: params.deepCrawledText,
      analysis: fullAnalysis,
    });

    // 3. Generăm cardul de personalitate
    const personaCard = await generatePersonaCard({ context: finalPrompt });

    console.log('[ACTION] Final prompt and persona card generated successfully.');
    return { finalPrompt, personaCard };

  } catch (error: any) {
    console.error('[ACTION] Error during final prompt generation:', error.message);
    throw new Error(`Failed to generate the final prompt. ${error.message}`);
  }
}

// Acțiunile utilitare rămân la fel
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