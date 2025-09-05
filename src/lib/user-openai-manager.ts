// User-Specific AI Manager pentru OpenAI - izolarea utilizatorilor
import OpenAI from 'openai';
import { getAvailableApiKey, recordApiKeyUsage } from './openai-key-manager';

interface UserOpenAIInstance {
    userId: string;
    apiKey: string;
    client: OpenAI;
    createdAt: number;
    lastUsed: number;
    requestCount: number;
    tokensUsed: number;
}

class UserOpenAIManager {
    private userInstances = new Map<string, UserOpenAIInstance>();
    private readonly INSTANCE_TTL = 30 * 60 * 1000; // 30 minute TTL
    private readonly MAX_REQUESTS_PER_USER = 15; // Max 15 requests per session pentru OpenAI

    constructor() {
        // Cleanup expired instances every 5 minutes
        setInterval(() => this.cleanupExpiredInstances(), 5 * 60 * 1000);
    }

    /**
     * Obține sau creează o instanță OpenAI pentru un utilizator specific
     */
    async getUserOpenAIInstance(userId: string): Promise<{ client: OpenAI; apiKey: string }> {
        const existing = this.userInstances.get(userId);
        const now = Date.now();

        // Verifică dacă instanța existentă este validă
        if (existing && (now - existing.lastUsed) < this.INSTANCE_TTL) {
            // Verifică limita de request-uri per user
            if (existing.requestCount >= this.MAX_REQUESTS_PER_USER) {
                throw new Error(`Ai depășit limita de ${this.MAX_REQUESTS_PER_USER} cereri per sesiune. Te rugăm să aștepți ${Math.ceil(this.INSTANCE_TTL / 60000)} minute.`);
            }

            existing.lastUsed = now;
            existing.requestCount++;

            console.log(`[USER_OPENAI_MANAGER] Reusing OpenAI instance for user ${userId} (${existing.requestCount}/${this.MAX_REQUESTS_PER_USER} requests)`);

            return {
                client: existing.client,
                apiKey: existing.apiKey,
            };
        }

        // Creează o nouă instanță
        const apiKey = getAvailableApiKey();
        const client = new OpenAI({
            apiKey: apiKey,
        });

        const newInstance: UserOpenAIInstance = {
            userId,
            apiKey,
            client,
            createdAt: now,
            lastUsed: now,
            requestCount: 1,
            tokensUsed: 0,
        };

        this.userInstances.set(userId, newInstance);

        console.log(`[USER_OPENAI_MANAGER] Created new OpenAI instance for user ${userId} with key ...${apiKey.slice(-4)}`);

        return {
            client: newInstance.client,
            apiKey: newInstance.apiKey,
        };
    }

    /**
     * Înregistrează usage-ul pentru un utilizator
     */
    recordUserUsage(userId: string, inputText: string, outputText: string = '') {
        const instance = this.userInstances.get(userId);
        if (instance) {
            const totalText = inputText + outputText;
            const estimatedTokens = Math.ceil(totalText.length / 4); // Estimare aproximativă

            instance.tokensUsed += estimatedTokens;
            instance.lastUsed = Date.now();

            // Înregistrează și în API key manager
            recordApiKeyUsage(instance.apiKey, totalText);

            console.log(`[USER_OPENAI_MANAGER] Recorded ${estimatedTokens} tokens for user ${userId}`);
        }
    }

    /**
     * Obține statistici pentru un utilizator
     */
    getUserStats(userId: string): { requestCount: number; tokensUsed: number; timeRemaining: number } | null {
        const instance = this.userInstances.get(userId);
        if (!instance) return null;

        const timeRemaining = Math.max(0, this.INSTANCE_TTL - (Date.now() - instance.createdAt));

        return {
            requestCount: instance.requestCount,
            tokensUsed: instance.tokensUsed,
            timeRemaining: Math.ceil(timeRemaining / 60000), // în minute
        };
    }

    /**
     * Curăță instanțele expirate
     */
    private cleanupExpiredInstances() {
        const now = Date.now();
        const expiredUsers: string[] = [];

        this.userInstances.forEach((instance, userId) => {
            if (now - instance.lastUsed > this.INSTANCE_TTL) {
                expiredUsers.push(userId);
            }
        });

        expiredUsers.forEach(userId => {
            this.userInstances.delete(userId);
            console.log(`[USER_OPENAI_MANAGER] Cleaned up expired instance for user ${userId}`);
        });

        if (expiredUsers.length > 0) {
            console.log(`[USER_OPENAI_MANAGER] Cleaned up ${expiredUsers.length} expired instances`);
        }
    }

    /**
     * Obține statistici globale
     */
    getGlobalStats() {
        const activeUsers = this.userInstances.size;
        const totalRequests = Array.from(this.userInstances.values())
            .reduce((sum, instance) => sum + instance.requestCount, 0);
        const totalTokens = Array.from(this.userInstances.values())
            .reduce((sum, instance) => sum + instance.tokensUsed, 0);

        return {
            activeUsers,
            totalRequests,
            totalTokens,
            instancesCount: this.userInstances.size,
        };
    }
}

// Singleton instance
const userOpenAIManager = new UserOpenAIManager();

/**
 * Helper function pentru a obține instanța OpenAI a unui utilizator
 */
export async function getUserOpenAI(userId: string) {
    return await userOpenAIManager.getUserOpenAIInstance(userId);
}

/**
 * Helper function pentru a înregistra usage-ul unui utilizator
 */
export function recordUserOpenAIUsage(userId: string, inputText: string, outputText: string = '') {
    userOpenAIManager.recordUserUsage(userId, inputText, outputText);
}

/**
 * Helper function pentru a obține statistici user
 */
export function getUserOpenAIStats(userId: string) {
    return userOpenAIManager.getUserStats(userId);
}

/**
 * Helper function pentru statistici globale
 */
export function getGlobalOpenAIStats() {
    return userOpenAIManager.getGlobalStats();
}

export { userOpenAIManager };
