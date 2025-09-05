// Timeout utilities pentru a preveni 504 Gateway Timeout
export const TIMEOUT_CONFIGS = {
    // Timeouts pentru diferite operații (în milisecunde)
    QUICK_SCAN: 20000,        // 20s pentru scan rapid (crescut de la 15s)
    AI_GENERATION: 40000,     // 40s pentru generare AI (crescut de la 20s) 
    DEEP_CRAWL: 45000,        // 45s pentru crawling profund (crescut de la 30s)
    TOTAL_REQUEST: 90000,     // 90s timeout total pentru request (crescut de la 45s)
    PHASE_1_ANALYSIS: 75000,  // 75s pentru faza 1 completă (nou)
} as const;

/**
 * Wrapper function care adaugă timeout la orice Promise
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string = 'Operation'
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`${operation} timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
            .then((result) => {
                clearTimeout(timeoutId);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

/**
 * Retry function cu exponential backoff
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    baseDelay: number = 1000,
    operationName: string = 'Operation'
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            console.log(`[RETRY] ${operationName} - Attempt ${attempt}/${maxRetries + 1}`);
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.warn(`[RETRY] ${operationName} failed on attempt ${attempt}: ${lastError.message}`);

            if (attempt <= maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`[RETRY] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`${operationName} failed after ${maxRetries + 1} attempts. Last error: ${lastError!.message}`);
}

/**
 * Function pentru a verifica dacă suntem în producție și să ajusteze timeout-urile
 */
export function getProductionTimeout(baseTimeout: number): number {
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = !!process.env.VERCEL;

    if (isProduction || isVercel) {
        // Reduce timeouts în producție pentru a evita 504 errors
        return Math.min(baseTimeout, 25000); // Max 25s pentru Vercel
    }

    return baseTimeout;
}

/**
 * Funcție pentru optimizarea performanței în producție
 */
export function optimizeForProduction<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const timeout = getProductionTimeout(TIMEOUT_CONFIGS.AI_GENERATION);

    return withTimeout(
        withRetry(operation, 1, 1000, operationName), // Doar 1 retry în producție
        timeout,
        operationName
    );
}
