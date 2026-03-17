import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
//  RATE LIMITER — In-memory sliding window per IP
//  Vercel serverless: each instance has its own map, so this
//  is best-effort (not globally synchronized). Good enough
//  for single-region deployments.
// ═══════════════════════════════════════════════════════════

interface RateEntry {
  count: number;
  windowStart: number;
}

const rateLimits: Record<string, { maxReqs: number; windowMs: number }> = {
  '/api/v1/catalog': { maxReqs: 60, windowMs: 60_000 },
  '/api/v1/stats':   { maxReqs: 60, windowMs: 60_000 },
  '/api/mcp':        { maxReqs: 120, windowMs: 60_000 },
};

const store = new Map<string, RateEntry>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 120_000) store.delete(key);
  }
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Only rate-limit API routes
  const limitConfig = rateLimits[path];
  if (!limitConfig) return NextResponse.next();

  cleanup();

  const ip = getClientIP(req);
  const key = `${ip}:${path}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now - entry.windowStart > limitConfig.windowMs) {
    entry = { count: 0, windowStart: now };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > limitConfig.maxReqs) {
    const retryAfter = Math.ceil((entry.windowStart + limitConfig.windowMs - now) / 1000);
    return NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: `Too many requests. Limit: ${limitConfig.maxReqs} per ${limitConfig.windowMs / 1000}s. Retry after ${retryAfter}s.`,
        retry_after: retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limitConfig.maxReqs),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((entry.windowStart + limitConfig.windowMs) / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limitConfig.maxReqs));
  response.headers.set('X-RateLimit-Remaining', String(limitConfig.maxReqs - entry.count));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil((entry.windowStart + limitConfig.windowMs) / 1000)));
  return response;
}

export const config = {
  matcher: ['/api/v1/:path*', '/api/mcp'],
};
