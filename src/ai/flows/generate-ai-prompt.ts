'use server';

/**
 * @fileOverview A Genkit flow that constructs a tailored 'system prompt' for an AI model by combining user form responses and crawled web content.
 *
 * - constructTailoredSystemPrompt - A function that generates a system prompt based on user input and crawled data.
 * - ConstructTailoredSystemPromptInput - The input type for the constructTailoredSystemPrompt function.
 * - ConstructTailoredSystemPromptOutput - The return type for the constructTailoredSystemPrompt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { WebsiteAnalysis } from '@/lib/types';
import { WebsiteAnalysisSchema, QuickSurveyDataSchema } from '@/lib/types';

const ConstructTailoredSystemPromptInputSchema = z.object({
  formResponses: z.record(z.string()).describe('User-provided responses from the dynamic survey form.'),
  crawledText: z.string().describe('The extracted text content from the crawled website. Can be empty if the user skipped this step.'),
  analysis: WebsiteAnalysisSchema.describe('User-confirmed analysis of the website.'),
  quickSurveyResponses: QuickSurveyDataSchema.describe('User-provided responses from the initial quick survey.'),
});
export type ConstructTailoredSystemPromptInput = z.infer<typeof ConstructTailoredSystemPromptInputSchema>;

const ConstructTailoredSystemPromptOutputSchema = z.object({
  finalPrompt: z.string().describe('The generated system prompt for the AI model.'),
});
export type ConstructTailoredSystemPromptOutput = z.infer<typeof ConstructTailoredSystemPromptOutputSchema>;

export async function constructTailoredSystemPrompt(input: ConstructTailoredSystemPromptInput): Promise<ConstructTailoredSystemPromptOutput> {
  return constructTailoredSystemPromptFlow(input);
}

export const constructTailoredSystemPromptFlow = ai.defineFlow(
  {
    name: 'constructTailoredSystemPromptFlow',
    inputSchema: ConstructTailoredSystemPromptInputSchema,
    outputSchema: ConstructTailoredSystemPromptOutputSchema,
  },
  async input => {
    const {
      formResponses,
      crawledText,
      quickSurveyResponses,
    } = input;

    const formattedDynamicResponses = Object.entries(formResponses)
      .map(([question, answer]) => `- Întrebare: "${question}"\n  - Răspuns: "${answer}"`) // Corrected escaping for newline and quotes within the string literal
      .join('\n');

    const formattedQuickSurveyResponses = quickSurveyResponses 
      ? Object.entries(quickSurveyResponses)
          .map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            const question = key; // In the future, map keys to full questions if needed
            const answer = Array.isArray(value) ? value.join(', ') : value;
            return `- ${question}: ${answer}`;
          })
          .filter(Boolean)
          .join('\n')
      : 'N/A';

    const metaPrompt = `# CRISPE Framework: System Prompt Generation

## Capacity/Role (Capacitate/Rol)
You are a world-class AI architect specializing in crafting bespoke system prompts for enterprise-level conversational AI agents. You are a master of marketing, psychology, and AI engineering, capable of synthesizing diverse data sources into a single, coherent, and highly effective set of instructions for another AI.

## Insight (Perspectivă)
The goal is to create a "system prompt" for a new customer service chatbot. This prompt will be the chatbot's permanent brain. It needs to be perfect. The final output must be in Romanian. You have three sources of data:
1.  <InitialContext>: High-level, strategic answers from the client about their goals. This sets the overall direction.
2.  <WebsiteContent>: Raw, unstructured text from the client's website. This provides foundational knowledge but may be outdated or incomplete.
3.  <DetailedClientResponses>: Direct answers from the client to a detailed, strategic survey. This information is the **absolute source of truth** and MUST override any conflicting information from the other sources.

## Statement (Declarație)
Your task is to generate the complete, final system prompt for the chatbot. The prompt must be structured into three specific sections in a precise order: ### Persona și Obiectiv, <KnowledgeBase>, and ### Reguli Stricte.

## Personality (Personalitate)
Your work is meticulous, strategic, and precise. You think like an architect, building the prompt layer by layer. You are obsessed with clarity and eliminating ambiguity.

## Experiment (Experiment / Process)
Follow this exact multi-step process to construct the final prompt. This is a meta-prompting loop where you will generate, critique, and refine your own work.

### Step 1: Initial Synthesis and Knowledge Extraction
- **Analyze <InitialContext> and <DetailedClientResponses>:** First, meticulously review every client response from both sources. This is the most critical data. The detailed responses are the ultimate source of truth.
- **Analyze <WebsiteContent>:** Next, scan the website content.
- **Construct the <KnowledgeBase>:**
    - Extract key information (services, products, contact details, hours, procedures, company info) from all sources.
    - Structure this information using clear, descriptive XML tags (e.g., <servicii>, <produs>, <contact>, <program_lucru>).
    - **Crucial Conflict Resolution:** Where the client's responses contradict the website content, the client's response is ALWAYS correct. You must use the client's data.
    - If website content is empty or 'N/A', build the knowledge base exclusively from the client's responses. Do not invent information.

### Step 2: First Draft Generation (Internal Monologue)
- Based on your synthesis, write a first draft of the complete system prompt. This draft should include:
    - ### Persona și Obiectiv: Define the chatbot's role, main objective, tone of voice, and engagement rules, based *strictly* on the client's responses.
    - <KnowledgeBase>: The structured knowledge you've already built.
    - ### Reguli Stricte (Ce NU trebuie să faci): Include a mandatory set of negative constraints. This section MUST include all of the following rules: "NU oferi sfaturi medicale, legale sau financiare.", "NU garanta rezultate sau succes.", "NU colecta informații sensibile precum parole sau date de card bancar.", "Dacă nu cunoști un răspuns cu certitudine din KnowledgeBase, afirmă clar acest lucru și oferă o metodă de contact cu un om.", "NU formata textul folosind Markdown (fără bold **, italic *), etc.). Răspunde doar cu text simplu.", "NU include imagini, GIF-uri, sau orice alt tip de media în răspunsuri."

### Step 3: Self-Correction and Critique (Internal Monologue)
- Now, critique your own first draft. Ask yourself these questions:
    - "Is the Persona section a perfect reflection of the client's answers, or did I accidentally infer something from the website?"
    - "Is the KnowledgeBase clear, accurate, and well-structured? Did I resolve all conflicts correctly?"
    - "Are the rules strict enough? Is there any ambiguity that could lead to an undesirable chatbot behavior?"
    - "Is the entire prompt written in flawless, natural-sounding Romanian?"

### Step 4: Final Prompt Generation
- Based on your self-critique, write the final, polished version of the system prompt.
- The output must be a single, raw text block.
- Do not add any titles, explanations, or conversational text. The output should be ready to be copied and pasted directly as a system prompt.

<InitialContext>
${formattedQuickSurveyResponses}
</InitialContext>

<WebsiteContent>
${crawledText || 'N/A'}
</WebsiteContent>

<DetailedClientResponses>
${formattedDynamicResponses}
</DetailedClientResponses>`;



    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        const { text: finalPrompt } = await ai.generate({
          prompt: metaPrompt,
        });

        if (finalPrompt) {
          return {
            finalPrompt: finalPrompt,
          };
        }
        throw new Error('No output from prompt generation.');
      } catch (error: any) {
        console.warn(`Prompt generation attempt failed: ${error.message}`);
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to generate prompt after several retries: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    // This part should not be reachable if retries are exhausted, as the error will be thrown.
    // But to satisfy TypeScript's need for a return path, we'll throw an error here too.
    throw new Error('Failed to generate prompt and exited retry loop unexpectedly.');
  }
);
