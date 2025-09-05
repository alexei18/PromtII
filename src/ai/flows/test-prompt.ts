'use server';

/**
 * @fileOverview A flow to test a given system prompt in a chat-like conversation.
 *
 * - testPrompt - A function that simulates a chat response based on a system prompt.
 * - TestPromptInput - The input type for the testPrompt function.
 * - TestPromptOutput - The return type for the testPrompt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ChatMessageSchema } from '@/lib/types';
import { dynamicOpenAIManager } from '@/lib/dynamic-openai';

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
  async (input: TestPromptInput) => {
    const { systemPrompt, userMessage, history } = input;

    // Construim un prompt care include sistemul și mesajul utilizatorului
    const conversationHistory = history.length > 0
      ? history.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : '';

    const fullPrompt = `You are an AI assistant with the following instructions:

${systemPrompt}

${conversationHistory ? `Conversation history:\n${conversationHistory}\n` : ''}User: ${userMessage}

Please respond as the AI assistant based on the instructions above:`;

    try {
      const result = await dynamicOpenAIManager.generateWithTracking(fullPrompt, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      return { response: result.content };
    } catch (error: any) {
      console.error('[TEST_PROMPT] Error:', error.message);
      throw new Error(`Failed to test prompt: ${error.message}`);
    }
  }
);

