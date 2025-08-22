// User-Specific AI Manager pentru izolarea utilizatorilor
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAvailableApiKey, recordApiKeyUsage } from './api-key-manager';

interface UserAIInstance {
  userId: string;
  apiKey: string;
  model: any; // GoogleGenerativeAI model instance
  createdAt: number;
  lastUsed: number;
  requestCount: number;
  tokensUsed: number;
}

class UserAIManager {
  private userInstances = new Map<string, UserAIInstance>();
  private readonly INSTANCE_TTL = 30 * 60 * 1000; // 30 minute TTL
  private readonly MAX_REQUESTS_PER_USER = 10; // Max 10 requests per session
  
  constructor() {
    // Cleanup expired instances every 5 minutes
    setInterval(() => this.cleanupExpiredInstances(), 5 * 60 * 1000);
  }

  /**
   * Obține sau creează o instanță AI pentru un utilizator specific
   */
  async getUserAIInstance(userId: string): Promise<{ model: any; apiKey: string }> {
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
      console.log(`[USER_AI_MANAGER] Reusing AI instance for user ${userId} (${existing.requestCount}/${this.MAX_REQUESTS_PER_USER} requests)`);
      
      return {
        model: existing.model,
        apiKey: existing.apiKey,
      };
    }

    // Creează o nouă instanță
    const apiKey = getAvailableApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const newInstance: UserAIInstance = {
      userId,
      apiKey,
      model,
      createdAt: now,
      lastUsed: now,
      requestCount: 1,
      tokensUsed: 0,
    };

    this.userInstances.set(userId, newInstance);
    console.log(`[USER_AI_MANAGER] Created new AI instance for user ${userId} with key ...${apiKey.slice(-4)}`);

    return {
      model: newInstance.model,
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
      recordApiKeyUsage(instance.apiKey, totalText);
      
      // Estimează token-uri pentru user tracking
      const estimatedTokens = Math.ceil(totalText.length / 4);
      instance.tokensUsed += estimatedTokens;
      
      console.log(`[USER_AI_MANAGER] User ${userId} used ~${estimatedTokens} tokens (total: ${instance.tokensUsed})`);
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
      timeRemaining,
    };
  }

  /**
   * Curăță instanțele expirate
   */
  private cleanupExpiredInstances() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, instance] of this.userInstances.entries()) {
      if (now - instance.lastUsed > this.INSTANCE_TTL) {
        this.userInstances.delete(userId);
        cleanedCount++;
        console.log(`[USER_AI_MANAGER] Cleaned up expired instance for user ${userId}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[USER_AI_MANAGER] Cleaned up ${cleanedCount} expired instances. Active: ${this.userInstances.size}`);
    }
  }

  /**
   * Resetează limita pentru un utilizator (pentru debugging)
   */
  resetUserLimits(userId: string) {
    const instance = this.userInstances.get(userId);
    if (instance) {
      instance.requestCount = 0;
      instance.tokensUsed = 0;
      instance.createdAt = Date.now();
      console.log(`[USER_AI_MANAGER] Reset limits for user ${userId}`);
    }
  }

  /**
   * Obține statistici globale
   */
  getGlobalStats(): { 
    activeUsers: number; 
    totalRequests: number; 
    totalTokens: number; 
    averageRequestsPerUser: number;
  } {
    const instances = Array.from(this.userInstances.values());
    const totalRequests = instances.reduce((sum, instance) => sum + instance.requestCount, 0);
    const totalTokens = instances.reduce((sum, instance) => sum + instance.tokensUsed, 0);
    
    return {
      activeUsers: instances.length,
      totalRequests,
      totalTokens,
      averageRequestsPerUser: instances.length > 0 ? totalRequests / instances.length : 0,
    };
  }
}

// Singleton instance
const userAIManager = new UserAIManager();

/**
 * Helper function pentru a obține instanța AI a unui utilizator
 */
export async function getUserAI(userId: string) {
  return await userAIManager.getUserAIInstance(userId);
}

/**
 * Helper function pentru a înregistra usage-ul unui utilizator
 */
export function recordUserAIUsage(userId: string, inputText: string, outputText: string = '') {
  userAIManager.recordUserUsage(userId, inputText, outputText);
}

export { userAIManager };