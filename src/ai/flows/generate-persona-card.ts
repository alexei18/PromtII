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
  prompt: `# Task
You are a branding expert AI. Your task is to analyze the provided chatbot system prompt and extract its core personality traits into a concise "Persona Card".

# Instructions
1.  Read the content from the \`<context>\` tag.
2.  Based on the prompt, synthesize the following attributes.
3.  **Name:** Give the AI a short, friendly name that fits its described personality.
4.  **Personality:** Summarize the tone and character in one short sentence.
5.  **Objective:** State the main goal of the AI in a clear, concise sentence.
6.  **Key Rules:** Extract the 3 most important "DO NOT" rules from the strict rules section. Summarize them.
7.  The response MUST be in Romanian.

<context>
{{{context}}}
</context>
`,
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
