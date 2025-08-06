'use server';

/**
 * @fileOverview A flow to test a given system prompt in a chat-like conversation.
 *
 * - testPrompt - A function that simulates a chat response based on a system prompt.
 * - TestPromptInput - The input type for the testPrompt function.
 * - TestPromptOutput - The return type for the testPrompt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ChatMessageSchema } from '@/lib/types';

const TestPromptInputSchema = z.object({
  systemPrompt: z.string().describe('The system prompt to test.'),
  userMessage: z.string().describe('The latest message from the user.'),
  history: z.array(ChatMessageSchema).describe('The conversation history.'),
});
export type TestPromptInput = z.infer<typeof TestPromptInputSchema>;

const TestPromptOutputSchema = z.object({
  response: z.string().describe('The AI model\'s response.'),
});
export type TestPromptOutput = z.infer<typeof TestPromptOutputSchema>;

export async function testPrompt(input: TestPromptInput): Promise<TestPromptOutput> {
  return testPromptFlow(input);
}

const testPromptFlow = ai.defineFlow(
  {
    name: 'testPromptFlow',
    inputSchema: TestPromptInputSchema,
    outputSchema: TestPromptOutputSchema,
  },
  async ({ systemPrompt, userMessage, history }) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash', // Explicitly use the desired model
      system: systemPrompt,
      prompt: userMessage,
      history: history,
    });
    
    return { response: text };
  }
);
