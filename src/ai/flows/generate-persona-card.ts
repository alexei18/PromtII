'use server';

/**
 * @fileOverview A flow that generates a "Persona Card" by summarizing a system prompt.
 *
 * - generatePersonaCard - A function that extracts key personality traits from a prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PersonaCardDataSchema, type PersonaCardData } from '@/lib/types';
import { dynamicOpenAIManager } from '@/lib/dynamic-openai';

const GeneratePersonaCardInputSchema = z.object({
  context: z.string().describe('The final generated system prompt.'),
});

export type GeneratePersonaCardInput = z.infer<typeof GeneratePersonaCardInputSchema>;

export async function generatePersonaCard(input: GeneratePersonaCardInput): Promise<PersonaCardData> {
  return generatePersonaCardFlow(input);
}

const generatePersonaCardFlow = ai.defineFlow(
  {
    name: 'generatePersonaCardFlow',
    inputSchema: GeneratePersonaCardInputSchema,
    outputSchema: PersonaCardDataSchema,
  },
  async (input: GeneratePersonaCardInput) => {
    const metaPrompt = `# Role (Rol)
You are a branding expert AI. Your task is to analyze a comprehensive chatbot system prompt and distill its essence into a concise, easy-to-understand "Persona Card".

# Action (Acțiune)
Analyze the provided system prompt in the \`<context>\` tag and extract the core personality and operational parameters.

# Context (Context)
The system prompt contains three sections: "Persona și Obiectiv", "KnowledgeBase", and "Reguli Stricte". You must read all three to get a complete picture. The final output must be a JSON object and must be in Romanian.

# Expectation (Așteptări)
Follow this step-by-step reasoning process:
1.  **Analyze Persona:** Read the "Persona și Obiectiv" section. Synthesize the chatbot's role, tone, and communication style. Based on this, invent a short, fitting, and friendly name for the AI.
2.  **Analyze Objective:** Identify the single most important goal of the chatbot from the "Persona și Obiectiv" section. State it clearly and concisely.
3.  **Analyze Rules:** Scrutinize the "Reguli Stricte" section. Identify the three most critical operational constraints that define the chatbot's boundaries.
4.  **Synthesize and Format:** Assemble the extracted information into a JSON object that matches this schema. CRITICAL: Your response MUST contain ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or anything else. The response should start with { and end with }.

{
  "name": string, // Short friendly name for the AI (Romanian)
  "description": string, // Brief description of AI's purpose (Romanian)
  "mainObjective": string, // Primary goal (Romanian)
  "keyRules": string[] // Array of 3 most important rules (Romanian)
}

**REMEMBER:** Respond with ONLY the JSON object, no additional text or formatting.

<context>
${input.context}
</context>`;

    try {
      const result = await dynamicOpenAIManager.generateWithTracking(metaPrompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const responseText = result.content.trim();

      try {
        // Try to extract JSON from the response
        let jsonText = responseText;

        // Remove markdown code blocks if present
        jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');

        // Look for JSON object boundaries
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }

        console.log('[GENERATE_PERSONA_CARD] Attempting to parse JSON:', jsonText.substring(0, 200) + '...');

        const parsedOutput = JSON.parse(jsonText);

        // Transform the response to match the expected schema
        const transformedOutput = {
          name: parsedOutput.name,
          personality: parsedOutput.description || parsedOutput.personality || 'Asistent virtual prietenos',
          objective: parsedOutput.mainObjective || parsedOutput.objective || 'Să ajut utilizatorii',
          keyRules: parsedOutput.keyRules || []
        };

        // Validarea schemei de ieșire
        const validatedOutput = PersonaCardDataSchema.parse(transformedOutput);
        return validatedOutput;

      } catch (parseError) {
        console.error('[GENERATE_PERSONA_CARD] JSON parse error:', parseError);
        console.error('[GENERATE_PERSONA_CARD] Raw response:', responseText);
        throw new Error('Failed to parse AI response as valid JSON');
      }

    } catch (error: any) {
      console.error('[GENERATE_PERSONA_CARD] Error:', error.message);
      throw new Error(`Failed to generate persona card: ${error.message}`);
    }
  }
);
