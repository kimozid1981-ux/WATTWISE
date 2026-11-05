import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Verifies Firebase Authentication ID tokens without a service account, using
 * Google's public signing keys (documented Firebase procedure for third-party
 * JWT libraries).
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface VerifiedUser {
  uid: string;
}

export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<VerifiedUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    return { uid: payload.sub };
  } catch {
    return null;
  }
}

export type AccessDecision =
  | { allowed: true; subject: string }
  | { allowed: false; status: 401 | 503; code: 'auth_required' | 'ai_not_configured' };

/** Who may call the paid AI extraction endpoint. */
export async function authoriseExtraction(
  authorization: string | null,
  ip: string,
  env: NodeJS.ProcessEnv = process.env,
  verify = verifyFirebaseIdToken,
): Promise<AccessDecision> {
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (projectId && token) {
    const user = await verify(token, projectId);
    if (user) return { allowed: true, subject: `uid:${user.uid}` };
    return { allowed: false, status: 401, code: 'auth_required' };
  }
  const anonymousAllowed = env.ALLOW_ANONYMOUS_EXTRACTION === 'true' && env.NODE_ENV !== 'production';
  if (anonymousAllowed) return { allowed: true, subject: `ip:${ip}` };
  return { allowed: false, status: 401, code: 'auth_required' };
}

/**
 * Simple fixed-window limiter. In-memory, so per server instance only: good
 * enough to stop accidental loops in development; production should use a
 * shared store (Firestore counter / Redis) — see docs/ARCHITECTURE.md.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  take(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count++;
    return true;
  }
}
