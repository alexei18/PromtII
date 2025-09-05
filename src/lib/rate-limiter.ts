// Rate limiter pentru a preveni depășirea quotei API
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const defaultLimits: RateLimitConfig = {
  maxRequests: 10, // Maxim 10 request-uri per IP (crescut de la 2)
  windowMs: 10000, // În 10 secunde (redus de la 120 secunde)
};

// Configurare mai permisivă pentru development
export const developmentLimits: RateLimitConfig = {
  maxRequests: 50, // Mult mai permisiv în development
  windowMs: 10000, // 10 secunde
};

// Configurare pentru producție - echilibrată
export const productionLimits: RateLimitConfig = {
  maxRequests: 15, // Generoas pentru utilizatori reali
  windowMs: 30000, // 30 secunde între resetări
};

// Funcție pentru a obține configurația potrivită pe baza environment-ului
export function getRateLimitConfig(): RateLimitConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isDevelopment) {
    return developmentLimits;
  } else if (isProduction) {
    return productionLimits;
  } else {
    return defaultLimits;
  }
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = getRateLimitConfig() // Folosește configurația dinamică
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const clientData = requestCounts.get(identifier);

  // Dacă nu există date sau fereastra de timp a expirat, resetează
  if (!clientData || now > clientData.resetTime) {
    const newData = { count: 1, resetTime: now + config.windowMs };
    requestCounts.set(identifier, newData);

    console.log(`[RATE_LIMITER] New window for ${identifier}: ${config.maxRequests} requests in ${config.windowMs}ms`);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newData.resetTime
    };
  }

  // Verifică dacă a depășit limita
  if (clientData.count >= config.maxRequests) {
    const waitTime = Math.ceil((clientData.resetTime - now) / 1000);
    console.log(`[RATE_LIMITER] Rate limit exceeded for ${identifier}. Wait ${waitTime}s`);

    return {
      allowed: false,
      remaining: 0,
      resetTime: clientData.resetTime
    };
  }

  // Incrementează contorul
  clientData.count++;
  console.log(`[RATE_LIMITER] Request ${clientData.count}/${config.maxRequests} for ${identifier}`);

  return {
    allowed: true,
    remaining: config.maxRequests - clientData.count,
    resetTime: clientData.resetTime
  };
}

export function clearRateLimit(identifier: string): void {
  requestCounts.delete(identifier);
}

// Funcție helper pentru a obține identificatorul clientului
export function getClientIdentifier(headers: Headers): string {
  // Încearcă să obțină IP-ul real din headers
  const forwarded = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');
  const cfConnectingIP = headers.get('cf-connecting-ip');

  // Folosește primul IP disponibil sau fallback la user-agent + timestamp
  const ip = forwarded?.split(',')[0]?.trim() ||
    realIP ||
    cfConnectingIP ||
    'unknown';

  return ip;
}