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
import { WebsiteAnalysisSchema } from '@/lib/types';

const ConstructTailoredSystemPromptInputSchema = z.object({
  formResponses: z.record(z.string()).describe('User-provided responses from the dynamic survey form.'),
  crawledText: z.string().describe('The extracted text content from the crawled website. Can be empty if the user skipped this step.'),
  analysis: WebsiteAnalysisSchema.describe('User-confirmed analysis of the website.'),
});
export type ConstructTailoredSystemPromptInput = z.infer<typeof ConstructTailoredSystemPromptInputSchema>;

const ConstructTailoredSystemPromptOutputSchema = z.object({
  finalPrompt: z.string().describe('The generated system prompt for the AI model.'),
});
export type ConstructTailoredSystemPromptOutput = z.infer<typeof ConstructTailoredSystemPromptOutputSchema>;

export async function constructTailoredSystemPrompt(input: ConstructTailoredSystemPromptInput): Promise<ConstructTailoredSystemPromptOutput> {
  return constructTailoredSystemPromptFlow(input);
}

const constructTailoredSystemPromptFlow = ai.defineFlow(
  {
    name: 'constructTailoredSystemPromptFlow',
    inputSchema: ConstructTailoredSystemPromptInputSchema,
    outputSchema: ConstructTailoredSystemPromptOutputSchema,
  },
  async input => {
    const {
      formResponses,
      crawledText,
    } = input;

    const formattedResponses = Object.entries(formResponses)
      .map(([question, answer]) => `- Întrebare: "${question}"\n  - Răspuns: "${answer}"`)
      .join('\n');

    const metaPrompt = `# Identity
You are an expert in marketing, digital strategy, and AI system prompt engineering. Your task is to generate a comprehensive, ready-to-use 'system prompt' in Romanian for a client's new chatbot.

# Instructions
1.  **Analyze Inputs:** You will receive \`<WebsiteContent>\` and \`<ClientResponses>\`.
2.  **Conflict Resolution Rule:** This is the most important rule. Information from \`<ClientResponses>\` **HAS ABSOLUTE PRIORITY**. If there is a conflict, you MUST use the information from the client's responses.
3.  **Step 1: Define Persona & Objective:**
    *   Based *strictly* on \`<ClientResponses>\`, construct a \`### Persona și Obiectiv\` section.
    *   Use the following sub-headings: \`**Rol:**\` (e.g., "Asistent virtual prietenos"), \`**Obiectiv Principal:**\` (e.g., "Colectarea de lead-uri calificate"), \`**Tonul Vocii:**\` (e.g., "Profesional, dar accesibil"), \`**Reguli de Angajament:**\` (e.g., "Întotdeauna proactiv, adresează-te clientului cu 'dumneavoastră'").
4.  **Step 2: Synthesize Knowledge Base:**
    *   Create a \`<KnowledgeBase>\` section.
    *   **Rule 4.1:** If \`<WebsiteContent>\` is provided and is not empty or 'N/A', systematically search it for the following information and structure it with descriptive XML tags:
        *   **Servicii/Produse:** (\`<servicii>\`, \`<produs id="...">\`)
        *   **Date de Contact:** (\`<contact>\`, \`<telefon>\`, \`<email>\`, \`<adresa>\`)
        *   **Program de Lucru:** (\`<program_lucru>\`, \`<zi nume="Luni-Vineri">\`)
        *   **Proceduri Specifice:** (e.g., \`<proces_admitere>\`, \`<politica_retur>\`)
        *   **Informații despre Companie:** (\`<despre_noi>\`, \`<misiune>\`)
    *   **Rule 4.2:** Review every piece of extracted information and **update, correct, or replace it** with data from \`<ClientResponses>\` if a more specific or conflicting answer exists there.
    *   **Rule 4.3 (Crucial):** If \`<WebsiteContent>\` is empty or 'N/A', you MUST build the entire \`<KnowledgeBase>\` **exclusively** from the information provided in \`<ClientResponses>\`. Do not invent information.
5.  **Step 3: Add Strict Rules:**
    *   Include a mandatory section titled \`### Reguli Stricte (Ce NU trebuie să faci)\`.
    *   This section must contain clear negative constraints. **Crucially, it must include all of the following rules:** "NU oferi sfaturi medicale, legale sau financiare.", "NU garanta rezultate sau succes.", "NU colecta informații sensibile precum parole sau date de card bancar.", "Dacă nu cunoști un răspuns cu certitudine din KnowledgeBase, afirmă clar acest lucru și oferă o metodă de contact cu un om.", "NU formata textul folosind Markdown (fără bold \`**\`, italic \`*\`, etc.). Răspunde doar cu text simplu.", "NU include imagini, GIF-uri, sau orice alt tip de media în răspunsuri."
6.  **Final Assembly & Output:**
    *   Construct the final, complete system prompt as a single block of raw text.
    *   The required order is: 1. \`### Persona și Obiectiv\`, 2. \`<KnowledgeBase>\`, 3. \`### Reguli Stricte\`.
    *   The entire output MUST be in Romanian.
    *   Do not add any titles, explanations, or conversational text outside the final prompt block.

<WebsiteContent>
${crawledText || 'N/A'}
</WebsiteContent>

<ClientResponses>
${formattedResponses}
</ClientResponses>`;

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