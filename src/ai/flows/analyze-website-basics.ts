'use server';

/**
 * @fileOverview A flow that performs a basic analysis of website content.
 *
 * - analyzeWebsiteBasics - A function that identifies industry, target audience, and tone of voice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WebsiteAnalysisSchema, type WebsiteAnalysis } from '@/lib/types';
import { optimizeTextForAI, logTextOptimization } from '@/lib/text-optimizer';
import { dynamicOpenAIManager } from '@/lib/dynamic-openai';

const AnalyzeWebsiteBasicsInputSchema = z.object({
  crawledText: z.string().describe('The crawled text content from the website.'),
});
export type AnalyzeWebsiteBasicsInput = z.infer<typeof AnalyzeWebsiteBasicsInputSchema>;

export async function analyzeWebsiteBasics(input: AnalyzeWebsiteBasicsInput): Promise<WebsiteAnalysis> {
  // Optimizăm textul înainte de analiză pentru a reduce consumul de token-uri
  const originalText = input.crawledText;
  const optimizedText = optimizeTextForAI(originalText, {
    maxCharacters: 300000, // Pentru analiza de bază, 30k este suficient
    preserveImportantSections: true,
    removeExtraWhitespace: true,
  });

  logTextOptimization(originalText, optimizedText);

  return analyzeWebsiteBasicsFlow({
    ...input,
    crawledText: optimizedText,
  });
}

const analyzeWebsitePrompt = `# Role (Rol)
You are an expert business analyst AI, specialized in extracting key business insights from unstructured web content. Your analysis is sharp, concise, and grounded in the provided data.

# Action (Acțiune)
Your task is to analyze the provided website content and determine the business's industry, target audience, and overall tone of voice.

# Context (Context)
You will be given a block of text extracted from a website. Your analysis must be based exclusively on this text. You need to synthesize the information to identify three key attributes:
1.  **Industry:** The specific sector the business operates in (e.g., "Law firm specializing in intellectual property", "E-commerce for handmade shoes").
2.  **Target Audience:** The specific demographic and psychographic profile of the ideal customer (e.g., "Young professionals aged 25-40 interested in sustainable fashion", "IT managers in medium-sized companies looking for cybersecurity solutions").
3.  **Tone of Voice:** The style of communication used on the website (e.g., "Formal and professional", "Friendly and informal", "Technical and informative").

# Expectation (Așteptări)
1.  **Step-by-Step Analysis:** Before providing the final answer, think step-by-step to break down the problem. First, identify keywords and phrases related to the industry. Second, analyze the language and messaging to infer the target audience. Third, evaluate the writing style to determine the tone of voice.
2.  **Concise and Specific:** Provide a concise and specific answer for each of the three attributes.
3.  **Handle Uncertainty:** If you cannot confidently determine one of the attributes from the text, you MUST return the string "Indeterminat" for that specific field. Do not guess.
4.  **Romanian Language:** The entire output, including your reasoning and the final answer, MUST be in Romanian.
5.  **Output Format:** The final output must be a JSON object that strictly adheres to the defined schema. CRITICAL: Your response MUST contain ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or anything else. The response should start with { and end with }.

**REMEMBER:** Respond with ONLY the JSON object, no additional text or formatting.

<content>
{{WEBSITE_CONTENT}}
</content>`;

const analyzeWebsiteBasicsFlow = ai.defineFlow(
  {
    name: 'analyzeWebsiteBasicsFlow',
    inputSchema: AnalyzeWebsiteBasicsInputSchema,
    outputSchema: WebsiteAnalysisSchema,
  },
  async (input: AnalyzeWebsiteBasicsInput) => {
    // Dacă textul primit este gol, aruncăm o eroare clară
    if (!input.crawledText || !input.crawledText.trim()) {
      throw new Error('analyzeWebsiteBasicsFlow received empty crawledText.');
    }

    console.log(`[analyzeWebsiteBasicsFlow] Analyzing text of length: ${input.crawledText.length}`);

    // Eliminăm logica complexă de "chunking" și trimitem tot textul direct
    // Acest lucru este mult mai robust.

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        console.log(`[ANALYZE_WEBSITE] Attempting analysis, retries left: ${retries}`);

        const promptWithContent = analyzeWebsitePrompt.replace('{{WEBSITE_CONTENT}}', input.crawledText);

        const result = await dynamicOpenAIManager.generateWithTracking(
          promptWithContent,
          {
            temperature: 0.3,
            maxTokens: 1000,
          }
        );

        if (result?.content) {
          // Încearcă să parseze rezultatul JSON
          try {
            // Try to extract JSON from the response
            let jsonText = result.content.trim();

            // Remove markdown code blocks if present
            jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');

            // Look for JSON object boundaries
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            }

            console.log('[ANALYZE_WEBSITE] Attempting to parse JSON:', jsonText.substring(0, 200) + '...');

            const parsedOutput = JSON.parse(jsonText);
            console.log(`[ANALYZE_WEBSITE] Analysis completed successfully`);
            return parsedOutput;
          } catch (parseError) {
            console.warn(`[ANALYZE_WEBSITE] Failed to parse JSON output, using raw text`);
            console.error('[ANALYZE_WEBSITE] Parse error:', parseError);
            console.error('[ANALYZE_WEBSITE] Raw response:', result.content);
            // Fallback cu structura de bază
            return {
              industry: result.content.substring(0, 200),
              targetAudience: 'Indeterminat',
              toneOfVoice: 'Indeterminat'
            };
          }
        }
        throw new Error('No output from analysis.');
      } catch (error: any) {
        console.warn(`[ANALYZE_WEBSITE] Analysis attempt failed: ${error.message}`);

        // Detectă keys suspendate și le marchează ca inactive
        if (error.message?.includes('CONSUMER_SUSPENDED') || error.message?.includes('suspended')) {
          console.error(`[ANALYZE_WEBSITE] Detected suspended API key - system will auto-switch`);
        } else if (error.message?.includes('User location is not supported') ||
          error.message?.includes('location is not supported')) {
          console.error(`[ANALYZE_WEBSITE] Detected location-restricted API key - system will auto-switch`);
        }

        retries--;

        if (retries === 0) {
          console.error(`[ANALYZE_WEBSITE] Failed to analyze after several retries: ${error.message}`);

          // Verifică dacă eroarea persistă din cauza lipsei de keys valide
          if (error.message?.includes('Nu sunt disponibile API keys alternative valide')) {
            throw new Error('Toate API keys sunt suspendate, restricționate geografic sau indisponibile. Te rugăm să verifici configurația.');
          } else if (error.message?.includes('User location is not supported') ||
            error.message?.includes('location is not supported')) {
            throw new Error('API key-urile configurate nu sunt disponibile pentru locația ta geografică. Te rugăm să folosești API keys cu acces global.');
          }

          throw new Error('Failed to analyze website content after multiple retries.');
        }

        // Exponential backoff cu jitter pentru rate limiting
        const jitter = Math.random() * 1000;
        const waitTime = delay + jitter;
        console.log(`[ANALYZE_WEBSITE] Waiting ${Math.round(waitTime)}ms before retry...`);

        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 2;
      }
    }

    // Această parte nu ar trebui să fie atinsă, dar este necesară pentru TypeScript
    throw new Error('Exited retry loop unexpectedly without returning a value.');
  }
);