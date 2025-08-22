// Rate limiter pentru a preveni depășirea quotei API
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const defaultLimits: RateLimitConfig = {
  maxRequests: 2, // Maxim 2 request-uri per IP
  windowMs: 120000, // În 2 minute (120 secunde)
};

export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig = defaultLimits
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const clientData = requestCounts.get(identifier);
  
  // Dacă nu există date sau fereastra de timp a expirat, resetează
  if (!clientData || now > clientData.resetTime) {
    const newData = { count: 1, resetTime: now + config.windowMs };
    requestCounts.set(identifier, newData);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newData.resetTime
    };
  }
  
  // Verifică dacă a depășit limita
  if (clientData.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: clientData.resetTime
    };
  }
  
  // Incrementează contorul
  clientData.count++;
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