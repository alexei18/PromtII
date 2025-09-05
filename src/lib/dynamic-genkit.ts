// Dynamic Genkit configurator pentru multiple API keys
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { getAvailableApiKey, recordApiKeyUsage, markApiKeySuspended, markApiKeyLocationIssue } from './api-key-manager';

interface DynamicAIConfig {
  apiKey: string;
  model: string;
}

class DynamicGenkitManager {
  private aiInstances = new Map<string, any>();

  /**
   * Creează o instanță Genkit cu un API key specific
   */
  private createAIInstance(apiKey: string): any {
    if (this.aiInstances.has(apiKey)) {
      return this.aiInstances.get(apiKey);
    }

    console.log(`[DYNAMIC_GENKIT] Creating new AI instance with key ...${apiKey.slice(-4)}`);
    
    const ai = genkit({
      plugins: [googleAI({ apiKey })],
      model: 'googleai/gemini-2.5-flash',
    });

    this.aiInstances.set(apiKey, ai);
    return ai;
  }

  /**
   * Obține o instanță AI cu load balancing automată
   */
  getAIInstance(): { ai: any; apiKey: string } {
    const apiKey = getAvailableApiKey();
    const ai = this.createAIInstance(apiKey);
    
    return { ai, apiKey };
  }

  /**
   * Wrapper pentru generate call cu tracking automată
   */
  async generateWithTracking(
    prompt: any,
    input: any,
    options: { userId?: string; trackUsage?: boolean } = {}
  ): Promise<any> {
    const { ai, apiKey } = this.getAIInstance();
    
    try {
      console.log(`[DYNAMIC_GENKIT] Starting generation with key ...${apiKey.slice(-4)}`);
      
      const result = await ai.generate({
        prompt,
        input,
      });

      // Track usage dacă este activat
      if (options.trackUsage !== false) {
        const inputText = JSON.stringify(input);
        const outputText = JSON.stringify(result);
        recordApiKeyUsage(apiKey, inputText + outputText);
        
        console.log(`[DYNAMIC_GENKIT] Generation completed successfully with key ...${apiKey.slice(-4)}`);
      }

      return result;
    } catch (error: any) {
      console.error(`[DYNAMIC_GENKIT] Generation failed with key ...${apiKey.slice(-4)}:`, error.message);
      
      // Detectă și marchează keys suspendate
      if (error.message?.includes('CONSUMER_SUSPENDED') || error.message?.includes('suspended')) {
        console.error(`[DYNAMIC_GENKIT] Key ...${apiKey.slice(-4)} is SUSPENDED - marking as inactive`);
        markApiKeySuspended(apiKey, 'API Key suspended by Google');
      }
      
      // Detectă și marchează keys cu probleme de locație
      if (error.message?.includes('User location is not supported') || 
          error.message?.includes('location is not supported') ||
          error.message?.includes('not supported for the API use')) {
        console.error(`[DYNAMIC_GENKIT] Key ...${apiKey.slice(-4)} has LOCATION RESTRICTION - marking as inactive`);
        markApiKeyLocationIssue(apiKey, 'API Key restricted for your geographic location');
      }
      
      // Detectă 503 Service Unavailable și încearcă cu alt key
      if (error.message?.includes('503') || error.message?.includes('Service Unavailable') || 
          error.message?.includes('overloaded')) {
        console.error(`[DYNAMIC_GENKIT] Key ...${apiKey.slice(-4)} encountered 503 Service Unavailable - trying different key`);
      }
      
      // Încearcă cu alt key pentru orice eroare care poate fi rezolvată prin schimbarea key-ului
      if (error.message?.includes('Too Many Requests') || 
          error.message?.includes('quota') || 
          error.message?.includes('CONSUMER_SUSPENDED') || 
          error.message?.includes('suspended') ||
          error.message?.includes('User location is not supported') ||
          error.message?.includes('location is not supported') ||
          error.message?.includes('503') ||
          error.message?.includes('Service Unavailable') ||
          error.message?.includes('overloaded') ||
          error.message?.includes('403') ||
          error.message?.includes('400')) {
        console.log(`[DYNAMIC_GENKIT] Trying with different API key...`);
        
        try {
          const { ai: retryAI, apiKey: retryKey } = this.getAIInstance();
          
          if (retryKey === apiKey) {
            console.error(`[DYNAMIC_GENKIT] No alternative API keys available`);
            throw new Error('Nu sunt disponibile API keys alternative valide.');
          }
          
          console.log(`[DYNAMIC_GENKIT] Retry attempt with key ...${retryKey.slice(-4)}`);
          
          const retryResult = await retryAI.generate({
            prompt,
            input,
          });

          if (options.trackUsage !== false) {
            const inputText = JSON.stringify(input);
            const outputText = JSON.stringify(retryResult);
            recordApiKeyUsage(retryKey, inputText + outputText);
          }

          console.log(`[DYNAMIC_GENKIT] Retry successful with key ...${retryKey.slice(-4)}`);
          return retryResult;
        } catch (retryError: any) {
          console.error(`[DYNAMIC_GENKIT] Retry also failed:`, retryError.message);
          
          // Marcă și al doilea key ca suspendat sau cu probleme de locație dacă este cazul
          if (retryError.message?.includes('CONSUMER_SUSPENDED') || retryError.message?.includes('suspended')) {
            const { apiKey: retryKey } = this.getAIInstance();
            markApiKeySuspended(retryKey, 'API Key suspended by Google');
          } else if (retryError.message?.includes('User location is not supported') || 
                     retryError.message?.includes('location is not supported')) {
            const { apiKey: retryKey } = this.getAIInstance();
            markApiKeyLocationIssue(retryKey, 'API Key restricted for your geographic location');
          }
          
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Wrapper pentru flow execution cu tracking
   */
  async runFlowWithTracking(
    flow: any,
    input: any,
    options: { userId?: string; trackUsage?: boolean } = {}
  ): Promise<any> {
    const { ai, apiKey } = this.getAIInstance();
    
    try {
      console.log(`[DYNAMIC_GENKIT] Running flow with key ...${apiKey.slice(-4)}`);
      
      const result = await flow(input);

      if (options.trackUsage !== false) {
        const inputText = JSON.stringify(input);
        const outputText = JSON.stringify(result);
        recordApiKeyUsage(apiKey, inputText + outputText);
      }

      return result;
    } catch (error: any) {
      console.error(`[DYNAMIC_GENKIT] Flow execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * Curăță instanțele cache-uite (pentru memory management)
   */
  clearCache() {
    console.log(`[DYNAMIC_GENKIT] Clearing ${this.aiInstances.size} cached AI instances`);
    this.aiInstances.clear();
  }
}

// Singleton instance
const dynamicGenkitManager = new DynamicGenkitManager();

/**
 * Helper function pentru generare cu load balancing automată
 */
export async function generateWithLoadBalancing(
  prompt: any,
  input: any,
  options?: { userId?: string; trackUsage?: boolean }
) {
  return await dynamicGenkitManager.generateWithTracking(prompt, input, options);
}

/**
 * Helper function pentru rularea flow-urilor cu load balancing
 */
export async function runFlowWithLoadBalancing(
  flow: any,
  input: any,
  options?: { userId?: string; trackUsage?: boolean }
) {
  return await dynamicGenkitManager.runFlowWithTracking(flow, input, options);
}

// Export pentru compatibilitate cu codul existent
export const ai = dynamicGenkitManager.getAIInstance().ai;

export { dynamicGenkitManager };