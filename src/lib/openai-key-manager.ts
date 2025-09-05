// API Key Manager pentru rotația automată a cheilor OpenAI
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

class OpenAIApiKeyManager {
    private apiKeys: string[] = [];
    private keyStats: Map<string, ApiKeyStats> = new Map();
    private readonly RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 ore
    private readonly MAX_TOKENS_PER_KEY_PER_DAY = 200000; // Limită mai realistă pentru planul Pay-as-you-go

    constructor() {
        this.loadApiKeys();
        this.initializeStats();
        console.log(`[OPENAI_API_KEY_MANAGER] Initialized with ${this.apiKeys.length} API keys`);
    }

    private loadApiKeys() {
        // Încărcăm API keys din environment
        const keys: (string | undefined)[] = [
            process.env.OPENAI_API_KEY_1,
            process.env.OPENAI_API_KEY_2,
            process.env.OPENAI_API_KEY_3,
            process.env.OPENAI_API_KEY_4,
            process.env.OPENAI_API_KEY_5,
            process.env.OPENAI_API_KEY, // Backward compatibility
        ];

        this.apiKeys = keys
            .filter((key): key is string => Boolean(key?.trim()))
            .filter((key, index, self) => self.indexOf(key) === index); // Remove duplicates

        if (this.apiKeys.length === 0) {
            throw new Error('No OpenAI API keys found in environment variables');
        }

        console.log(`[OPENAI_API_KEY_MANAGER] Loaded ${this.apiKeys.length} unique API keys`);
    }

    private initializeStats() {
        const now = Date.now();
        this.apiKeys.forEach(key => {
            if (!this.keyStats.has(key)) {
                this.keyStats.set(key, {
                    key,
                    tokensUsed: 0,
                    lastReset: now,
                    isActive: true,
                    lastUsed: 0,
                    isSuspended: false,
                    hasLocationIssue: false,
                });
            }
        });
    }

    private resetStatsIfNeeded() {
        const now = Date.now();
        this.keyStats.forEach((stats, key) => {
            if (now - stats.lastReset > this.RESET_INTERVAL) {
                console.log(`[OPENAI_API_KEY_MANAGER] Resetting stats for key ...${key.slice(-4)}`);
                stats.tokensUsed = 0;
                stats.lastReset = now;
                stats.isActive = true;
                stats.isSuspended = false;
                stats.hasLocationIssue = false;
                stats.suspendedReason = undefined;
            }

            // Reactivam key-urile suspendate pentru rate limit după o oră
            if (stats.isSuspended && stats.suspendedReason === 'Rate limit exceeded' &&
                now - stats.lastUsed > (60 * 60 * 1000)) { // 1 oră
                console.log(`[OPENAI_API_KEY_MANAGER] Reactivating rate-limited key ...${key.slice(-4)}`);
                stats.isSuspended = false;
                stats.isActive = true;
                stats.suspendedReason = undefined;
            }
        });
    }

    getAvailableApiKey(): string {
        this.resetStatsIfNeeded();

        // Filtru pentru keys disponibile
        const availableKeys = Array.from(this.keyStats.values())
            .filter(stats =>
                stats.isActive &&
                !stats.isSuspended &&
                !stats.hasLocationIssue &&
                stats.tokensUsed < this.MAX_TOKENS_PER_KEY_PER_DAY
            )
            .sort((a, b) => {
                // Prioritizăm keys cu utilizarea cea mai mică
                const usageA = a.tokensUsed / this.MAX_TOKENS_PER_KEY_PER_DAY;
                const usageB = b.tokensUsed / this.MAX_TOKENS_PER_KEY_PER_DAY;
                return usageA - usageB;
            });

        if (availableKeys.length === 0) {
            throw new Error('No available OpenAI API keys. All keys are suspended or have reached their daily limit.');
        }

        const selectedKey = availableKeys[0];
        selectedKey.lastUsed = Date.now();

        console.log(`[OPENAI_API_KEY_MANAGER] Selected key ...${selectedKey.key.slice(-4)} (${selectedKey.tokensUsed}/${this.MAX_TOKENS_PER_KEY_PER_DAY} tokens used)`);
        return selectedKey.key;
    }

    recordApiKeyUsage(apiKey: string, text: string, exactTokens?: number) {
        const stats = this.keyStats.get(apiKey);
        if (stats) {
            let tokensToAdd: number;

            if (exactTokens && exactTokens > 0) {
                // Folosim token count-ul exact de la OpenAI
                tokensToAdd = exactTokens;
            } else {
                // Estimăm numărul de token-uri (aproximativ 4 caractere per token)
                tokensToAdd = Math.ceil(text.length / 4);
            }

            stats.tokensUsed += tokensToAdd;
            stats.lastUsed = Date.now();

            console.log(`[OPENAI_API_KEY_MANAGER] Recorded ${tokensToAdd} tokens for key ...${apiKey.slice(-4)} (total: ${stats.tokensUsed})`);
        }
    }

    markApiKeySuspended(apiKey: string, reason?: string) {
        const stats = this.keyStats.get(apiKey);
        if (stats) {
            stats.isSuspended = true;
            stats.isActive = false;
            stats.suspendedReason = reason;
            console.warn(`[OPENAI_API_KEY_MANAGER] Marked key ...${apiKey.slice(-4)} as SUSPENDED: ${reason || 'Unknown reason'}`);
        }
    }

    markApiKeyLocationIssue(apiKey: string, reason?: string) {
        const stats = this.keyStats.get(apiKey);
        if (stats) {
            stats.hasLocationIssue = true;
            stats.isActive = false;
            console.warn(`[OPENAI_API_KEY_MANAGER] Marked key ...${apiKey.slice(-4)} as LOCATION ISSUE: ${reason || 'Geographic restriction'}`);
        }
    }

    getStats() {
        return Array.from(this.keyStats.values()).map(stats => ({
            keyPreview: `...${stats.key.slice(-4)}`,
            tokensUsed: stats.tokensUsed,
            isActive: stats.isActive,
            isSuspended: stats.isSuspended,
            hasLocationIssue: stats.hasLocationIssue,
            lastUsed: new Date(stats.lastUsed).toISOString(),
            usage: `${stats.tokensUsed}/${this.MAX_TOKENS_PER_KEY_PER_DAY}`,
            suspendedReason: stats.suspendedReason,
        }));
    }
}

// Singleton instance
const openaiApiKeyManager = new OpenAIApiKeyManager();

/**
 * Helper function pentru a obține un API key disponibil
 */
export function getAvailableApiKey(): string {
    return openaiApiKeyManager.getAvailableApiKey();
}

/**
 * Helper function pentru a înregistra usage-ul de token-uri
 */
export function recordApiKeyUsage(apiKey: string, text: string, exactTokens?: number) {
    openaiApiKeyManager.recordApiKeyUsage(apiKey, text, exactTokens);
}

/**
 * Helper function pentru a marca un API key ca suspendat
 */
export function markApiKeySuspended(apiKey: string, reason?: string) {
    openaiApiKeyManager.markApiKeySuspended(apiKey, reason);
}

/**
 * Helper function pentru a marca un API key ca având probleme de locație
 */
export function markApiKeyLocationIssue(apiKey: string, reason?: string) {
    openaiApiKeyManager.markApiKeyLocationIssue(apiKey, reason);
}

export { openaiApiKeyManager };
