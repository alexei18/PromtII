// Dynamic OpenAI configurator pentru multiple API keys
import OpenAI from 'openai';
import { getAvailableApiKey, recordApiKeyUsage, markApiKeySuspended, markApiKeyLocationIssue } from './openai-key-manager';

interface DynamicOpenAIConfig {
    apiKey: string;
    model: string;
}

class DynamicOpenAIManager {
    private openaiInstances = new Map<string, OpenAI>();
    private readonly DEFAULT_MODEL = 'gpt-4o'; // Model recomandat pentru sarcinile complexe
    private readonly FALLBACK_MODEL = 'gpt-3.5-turbo'; // Model de rezervă

    /**
     * Creează o instanță OpenAI cu un API key specific
     */
    private createOpenAIInstance(apiKey: string): OpenAI {
        if (this.openaiInstances.has(apiKey)) {
            return this.openaiInstances.get(apiKey)!;
        }

        console.log(`[DYNAMIC_OPENAI] Creating new OpenAI instance with key ...${apiKey.slice(-4)}`);

        const client = new OpenAI({
            apiKey: apiKey,
        });

        this.openaiInstances.set(apiKey, client);
        return client;
    }

    /**
     * Obține o instanță OpenAI cu load balancing automată
     */
    getOpenAIInstance(): { client: OpenAI; apiKey: string } {
        const apiKey = getAvailableApiKey();
        const client = this.createOpenAIInstance(apiKey);

        return { client, apiKey };
    }

    /**
     * Wrapper pentru generate call cu tracking automată
     */
    async generateWithTracking(
        prompt: string,
        options: {
            userId?: string;
            trackUsage?: boolean;
            model?: string;
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): Promise<{ content: string; model: string; usage?: any }> {
        const { client, apiKey } = this.getOpenAIInstance();
        const model = options.model || this.DEFAULT_MODEL;

        try {
            console.log(`[DYNAMIC_OPENAI] Generating with model ${model} using key ...${apiKey.slice(-4)}`);

            const response = await client.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: options.temperature || 0.3,
                max_tokens: options.maxTokens || 4000,
            });

            const content = response.choices[0]?.message?.content || '';

            if (options.trackUsage !== false) {
                // Înregistrăm usage-ul pentru API key folosind datele exacte de la OpenAI
                if (response.usage) {
                    recordApiKeyUsage(apiKey, '', response.usage.total_tokens);
                } else {
                    // Fallback la estimarea veche dacă nu avem date exacte
                    recordApiKeyUsage(apiKey, prompt + content);
                }
            }

            console.log(`[DYNAMIC_OPENAI] Generated ${content.length} characters with ${model}`);

            return {
                content,
                model,
                usage: response.usage
            };

        } catch (error: any) {
            console.error(`[DYNAMIC_OPENAI] Error with key ...${apiKey.slice(-4)}:`, error.message);

            // Gestionăm diferite tipuri de erori OpenAI
            if (error.status === 401) {
                markApiKeySuspended(apiKey, 'Invalid API key');
                throw new Error('API key invalid. A fost marcat ca suspendat.');
            }

            if (error.status === 429) {
                markApiKeySuspended(apiKey, 'Rate limit exceeded');

                // Încearcă din nou cu alt API key
                try {
                    console.log(`[DYNAMIC_OPENAI] Retrying with different API key...`);
                    const { client: retryClient, apiKey: retryKey } = this.getOpenAIInstance();

                    const retryResponse = await retryClient.chat.completions.create({
                        model: model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: options.temperature || 0.3,
                        max_tokens: options.maxTokens || 4000,
                    });

                    const retryContent = retryResponse.choices[0]?.message?.content || '';

                    if (options.trackUsage !== false) {
                        // Înregistrăm usage-ul pentru retry key folosind datele exacte
                        if (retryResponse.usage) {
                            recordApiKeyUsage(retryKey, '', retryResponse.usage.total_tokens);
                        } else {
                            recordApiKeyUsage(retryKey, prompt + retryContent);
                        }
                    }

                    return {
                        content: retryContent,
                        model,
                        usage: retryResponse.usage
                    };

                } catch (retryError: any) {
                    console.error(`[DYNAMIC_OPENAI] Retry failed:`, retryError.message);
                    throw new Error(`Toate API key-urile au depășit limita de utilizare: ${retryError.message}`);
                }
            }

            if (error.status === 403) {
                markApiKeyLocationIssue(apiKey, 'Geographic restriction or billing issue');
                throw new Error('API key are restricții geografice sau probleme de billing.');
            }

            if (error.message?.includes('model') && model === this.DEFAULT_MODEL) {
                // Încearcă cu modelul de rezervă
                console.log(`[DYNAMIC_OPENAI] Model ${this.DEFAULT_MODEL} not available, trying fallback model ${this.FALLBACK_MODEL}`);
                return this.generateWithTracking(prompt, {
                    ...options,
                    model: this.FALLBACK_MODEL
                });
            }

            throw new Error(`Eroare OpenAI: ${error.message}`);
        }
    }

    /**
     * Generate cu stream pentru răspunsuri lungi
     */
    async generateStreamWithTracking(
        prompt: string,
        onChunk: (chunk: string) => void,
        options: {
            userId?: string;
            trackUsage?: boolean;
            model?: string;
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): Promise<{ fullContent: string; model: string; usage?: any }> {
        const { client, apiKey } = this.getOpenAIInstance();
        const model = options.model || this.DEFAULT_MODEL;

        try {
            console.log(`[DYNAMIC_OPENAI] Streaming with model ${model} using key ...${apiKey.slice(-4)}`);

            const stream = await client.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: options.temperature || 0.3,
                max_tokens: options.maxTokens || 4000,
                stream: true,
            });

            let fullContent = '';

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullContent += content;
                    onChunk(content);
                }
            }

            if (options.trackUsage !== false) {
                recordApiKeyUsage(apiKey, prompt + fullContent);
            }

            console.log(`[DYNAMIC_OPENAI] Streamed ${fullContent.length} characters with ${model}`);

            return {
                fullContent,
                model,
            };

        } catch (error: any) {
            console.error(`[DYNAMIC_OPENAI] Stream error with key ...${apiKey.slice(-4)}:`, error.message);
            throw new Error(`Eroare OpenAI streaming: ${error.message}`);
        }
    }

    /**
     * Obține lista de modele disponibile
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            const { client } = this.getOpenAIInstance();
            const models = await client.models.list();

            return models.data
                .filter(model => model.id.startsWith('gpt-'))
                .map(model => model.id)
                .sort();

        } catch (error: any) {
            console.error('[DYNAMIC_OPENAI] Error fetching models:', error.message);
            return [this.DEFAULT_MODEL, this.FALLBACK_MODEL];
        }
    }

    /**
     * Test conexiune cu un API key specific
     */
    async testConnection(apiKey?: string): Promise<boolean> {
        try {
            const targetKey = apiKey || getAvailableApiKey();
            const client = this.createOpenAIInstance(targetKey);

            const response = await client.chat.completions.create({
                model: this.FALLBACK_MODEL,
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 5,
            });

            return response.choices.length > 0;

        } catch (error: any) {
            console.error('[DYNAMIC_OPENAI] Connection test failed:', error.message);
            return false;
        }
    }
}

// Singleton instance
const dynamicOpenAIManager = new DynamicOpenAIManager();

/**
 * Helper function pentru generare cu load balancing automată
 */
export async function generateWithLoadBalancing(
    prompt: string,
    options?: { userId?: string; trackUsage?: boolean; model?: string; temperature?: number }
) {
    return await dynamicOpenAIManager.generateWithTracking(prompt, options);
}

/**
 * Helper function pentru streaming cu load balancing
 */
export async function generateStreamWithLoadBalancing(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: { userId?: string; trackUsage?: boolean; model?: string; temperature?: number }
) {
    return await dynamicOpenAIManager.generateStreamWithTracking(prompt, onChunk, options);
}

/**
 * Helper function pentru testarea conexiunii
 */
export async function testOpenAIConnection(apiKey?: string) {
    return await dynamicOpenAIManager.testConnection(apiKey);
}

/**
 * Helper function pentru obținerea modelelor disponibile
 */
export async function getAvailableOpenAIModels() {
    return await dynamicOpenAIManager.getAvailableModels();
}

// Export pentru compatibilitate cu codul existent
export const openai = dynamicOpenAIManager.getOpenAIInstance().client;
export { dynamicOpenAIManager };
