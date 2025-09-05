import { dynamicOpenAIManager } from '@/lib/dynamic-openai';

// Export pentru noua implementare cu OpenAI și load balancing
export { dynamicOpenAIManager } from '@/lib/dynamic-openai';
export { generateWithLoadBalancing, generateStreamWithLoadBalancing, testOpenAIConnection, getAvailableOpenAIModels } from '@/lib/dynamic-openai';

// Compatibilitate pentru codul existent
export const ai = {
  generate: async (options: { prompt: string; config?: any }) => {
    const result = await dynamicOpenAIManager.generateWithTracking(
      options.prompt,
      {
        temperature: options.config?.temperature,
        maxTokens: options.config?.maxTokens,
      }
    );

    return {
      text: result.content,
      content: result.content,
      model: result.model,
      usage: result.usage,
    };
  },

  defineFlow: (config: any, handler: any) => {
    // Pentru compatibilitate cu flow-urile existente
    return async (input: any) => {
      return await handler(input);
    };
  }
};
