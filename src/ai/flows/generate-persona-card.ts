'use server';

/**
 * @fileOverview A flow that generates a "Persona Card" by summarizing a system prompt.
 *
 * - generatePersonaCard - A function that extracts key personality traits from a prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PersonaCardDataSchema, type PersonaCardData } from '@/lib/types';

const GeneratePersonaCardInputSchema = z.object({
  context: z.string().describe('The final generated system prompt.'),
});

export type GeneratePersonaCardInput = z.infer<typeof GeneratePersonaCardInputSchema>;

export async function generatePersonaCard(input: GeneratePersonaCardInput): Promise<PersonaCardData> {
  return generatePersonaCardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonaCardPrompt',
  input: { schema: GeneratePersonaCardInputSchema },
  output: { schema: PersonaCardDataSchema },
  prompt: `# Role (Rol)\nYou are a branding expert AI. Your task is to analyze a comprehensive chatbot system prompt and distill its essence into a concise, easy-to-understand \"Persona Card\".\n\n# Action (Acțiune)\nAnalyze the provided system prompt in the \`<context>\
tag and extract the core personality and operational parameters.\n\n# Context (Context)\nThe system prompt contains three sections: \"Persona și Obiectiv\", \"KnowledgeBase\", and \"Reguli Stricte\". You must read all three to get a complete picture. The final output must be a JSON object and must be in Romanian.\n\n# Expectation (Așteptări)\nFollow this step-by-step reasoning process:\n1.  **Analyze Persona:** Read the \"Persona și Obiectiv\" section. Synthesize the chatbot's role, tone, and communication style. Based on this, invent a short, fitting, and friendly name for the AI.\n2.  **Analyze Objective:** Identify the single most important goal of the chatbot from the \"Persona și Obiectiv\" section. State it clearly and concisely.\n3.  **Analyze Rules:** Scrutinize the \"Reguli Stricte\" section. Identify the three most critical operational constraints that define the chatbot's boundaries.\n4.  **Synthesize and Format:** Assemble the extracted information into a JSON object that matches the required schema. Ensure the language is Romanian.\n\n<context>\n{{{context}}}\n</context>\n`,
});


const generatePersonaCardFlow = ai.defineFlow(
  {
    name: 'generatePersonaCardFlow',
    inputSchema: GeneratePersonaCardInputSchema,
    outputSchema: PersonaCardDataSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (output) {
      return output;
    }
    throw new Error("Failed to generate persona card data.");
  }
);
