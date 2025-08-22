// API Key Manager pentru rotația automată a cheilor Google Gemini
interface ApiKeyStats {
  key: string;
  tokensUsed: number;
  lastReset: number;
  isActive: boolean;
  lastUsed: number;
  isSuspended: boolean;
  suspendedReason?: string;
  hasLocationIssue: boolean;
}

class ApiKeyManager {
  private keys: ApiKeyStats[] = [];
  private readonly TOKEN_LIMIT = 1000000; // 1M tokens per month
  private readonly RESET_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 zile în ms

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // Poți adăuga multiple API keys aici
    const apiKeys = [
      process.env.GOOGLE_API_KEY_1,
      process.env.GOOGLE_API_KEY_2,
      process.env.GOOGLE_API_KEY_3,
      process.env.GOOGLE_API_KEY_4,
      process.env.GOOGLE_API_KEY_5,
    ].filter(Boolean); // Elimină keys null/undefined

    this.keys = apiKeys.map(key => ({
      key: key!,
      tokensUsed: 0,
      lastReset: Date.now(),
      isActive: true,
      lastUsed: 0,
      isSuspended: false,
      hasLocationIssue: false,
    }));

    console.log(`[API_KEY_MANAGER] Initialized with ${this.keys.length} API keys`);
  }

  /**
   * Obține următorul API key disponibil cu cel mai puțin usage
   */
  getAvailableKey(): string | null {
    const now = Date.now();
    
    // Reset counters pentru keys care au trecut de perioada de reset
    this.keys.forEach(keyInfo => {
      if (now - keyInfo.lastReset > this.RESET_INTERVAL) {
        keyInfo.tokensUsed = 0;
        keyInfo.lastReset = now;
        keyInfo.isActive = true;
        console.log(`[API_KEY_MANAGER] Reset token count for key ending in ...${keyInfo.key.slice(-4)}`);
      }
    });

    // Găsește keys active care nu au depășit limita, nu sunt suspendate și nu au probleme de locație
    const availableKeys = this.keys.filter(keyInfo => 
      keyInfo.isActive && 
      keyInfo.tokensUsed < this.TOKEN_LIMIT && 
      !keyInfo.isSuspended && 
      !keyInfo.hasLocationIssue
    );

    if (availableKeys.length === 0) {
      const suspendedCount = this.keys.filter(k => k.isSuspended).length;
      const limitExceededCount = this.keys.filter(k => k.tokensUsed >= this.TOKEN_LIMIT).length;
      const locationIssueCount = this.keys.filter(k => k.hasLocationIssue).length;
      console.error(`[API_KEY_MANAGER] No available API keys! Suspended: ${suspendedCount}, Limit exceeded: ${limitExceededCount}, Location issues: ${locationIssueCount}, Total: ${this.keys.length}`);
      return null;
    }

    // Sortează după usage (cel mai puțin folosit primul)
    availableKeys.sort((a, b) => a.tokensUsed - b.tokensUsed);
    
    const selectedKey = availableKeys[0];
    selectedKey.lastUsed = now;

    console.log(`[API_KEY_MANAGER] Selected key ending in ...${selectedKey.key.slice(-4)} (${selectedKey.tokensUsed}/${this.TOKEN_LIMIT} tokens used)`);
    
    return selectedKey.key;
  }

  /**
   * Înregistrează usage-ul de token-uri pentru o cheie specifică
   */
  recordTokenUsage(apiKey: string, tokensUsed: number) {
    const keyInfo = this.keys.find(k => k.key === apiKey);
    if (keyInfo) {
      keyInfo.tokensUsed += tokensUsed;
      console.log(`[API_KEY_MANAGER] Recorded ${tokensUsed} tokens for key ...${apiKey.slice(-4)} (total: ${keyInfo.tokensUsed}/${this.TOKEN_LIMIT})`);
      
      // Marchează key-ul ca inactiv dacă a depășit limita
      if (keyInfo.tokensUsed >= this.TOKEN_LIMIT) {
        keyInfo.isActive = false;
        console.warn(`[API_KEY_MANAGER] Key ...${apiKey.slice(-4)} reached token limit and is now inactive`);
      }
    }
  }

  /**
   * Estimează numărul de token-uri dintr-un text
   */
  estimateTokens(text: string): number {
    // Estimare simplă: ~4 caractere = 1 token pentru Gemini
    return Math.ceil(text.length / 4);
  }

  /**
   * Obține statistici despre toate cheile
   */
  getKeyStats(): { 
    totalKeys: number; 
    activeKeys: number; 
    suspendedKeys: number;
    locationRestrictedKeys: number;
    totalTokensUsed: number;
  } {
    const activeKeys = this.keys.filter(k => k.isActive && !k.isSuspended && !k.hasLocationIssue).length;
    const suspendedKeys = this.keys.filter(k => k.isSuspended).length;
    const locationRestrictedKeys = this.keys.filter(k => k.hasLocationIssue).length;
    const totalTokensUsed = this.keys.reduce((sum, k) => sum + k.tokensUsed, 0);
    
    return {
      totalKeys: this.keys.length,
      activeKeys,
      suspendedKeys,
      locationRestrictedKeys,
      totalTokensUsed,
    };
  }

  /**
   * Marchează un API key ca fiind suspendat
   */
  markKeySuspended(apiKey: string, reason?: string) {
    const keyInfo = this.keys.find(k => k.key === apiKey);
    if (keyInfo) {
      keyInfo.isSuspended = true;
      keyInfo.isActive = false;
      keyInfo.suspendedReason = reason;
      console.error(`[API_KEY_MANAGER] Key ...${apiKey.slice(-4)} marked as SUSPENDED: ${reason || 'Unknown reason'}`);
    }
  }

  /**
   * Marchează un API key ca având probleme de locație geografică
   */
  markKeyLocationIssue(apiKey: string, reason?: string) {
    const keyInfo = this.keys.find(k => k.key === apiKey);
    if (keyInfo) {
      keyInfo.hasLocationIssue = true;
      keyInfo.isActive = false;
      keyInfo.suspendedReason = reason;
      console.error(`[API_KEY_MANAGER] Key ...${apiKey.slice(-4)} marked as LOCATION_RESTRICTED: ${reason || 'Unknown reason'}`);
    }
  }

  /**
   * Forțează resetarea unei chei specifice (pentru debugging)
   */
  resetKey(apiKey: string) {
    const keyInfo = this.keys.find(k => k.key === apiKey);
    if (keyInfo) {
      keyInfo.tokensUsed = 0;
      keyInfo.lastReset = Date.now();
      keyInfo.isActive = true;
      keyInfo.isSuspended = false;
      keyInfo.hasLocationIssue = false;
      keyInfo.suspendedReason = undefined;
      console.log(`[API_KEY_MANAGER] Manually reset key ...${apiKey.slice(-4)}`);
    }
  }
}

// Singleton instance
const apiKeyManager = new ApiKeyManager();

/**
 * Helper function pentru a obține un API key disponibil
 */
export function getAvailableApiKey(): string {
  const key = apiKeyManager.getAvailableKey();
  if (!key) {
    throw new Error('Nu sunt disponibile API keys. Toate au depășit limita de token-uri.');
  }
  return key;
}

/**
 * Helper function pentru a înregistra usage-ul de token-uri
 */
export function recordApiKeyUsage(apiKey: string, text: string) {
  const estimatedTokens = apiKeyManager.estimateTokens(text);
  apiKeyManager.recordTokenUsage(apiKey, estimatedTokens);
}

/**
 * Helper function pentru a marca un API key ca suspendat
 */
export function markApiKeySuspended(apiKey: string, reason?: string) {
  apiKeyManager.markKeySuspended(apiKey, reason);
}

/**
 * Helper function pentru a marca un API key ca având probleme de locație
 */
export function markApiKeyLocationIssue(apiKey: string, reason?: string) {
  apiKeyManager.markKeyLocationIssue(apiKey, reason);
}

export { apiKeyManager };