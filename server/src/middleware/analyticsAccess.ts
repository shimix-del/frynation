import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from './auth.js';
import { JWT_SECRET } from '../security.js';

// Additional owner section PIN, independent of every staff sign-in PIN.
// Hosting may override this deployment default with OWNER_ANALYTICS_PIN_HASH.
const pinHash = process.env.OWNER_ANALYTICS_PIN_HASH || '$2b$12$UD75jqRLk9Bn7BOiE0Iz2O59.f2sYPEPToCa/TONRGrnAPTkbdAwS';
const attempts = new Map<string, { count: number; until: number }>();
export async function unlockAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.user?.role !== 'OWNER') { res.status(403).json({ error: 'Owner access required' }); return; }
  const now = Date.now(), key = req.user.id, previous = attempts.get(key);
  if (previous && previous.until > now && previous.count >= 3) { res.status(429).json({ error: 'Too many incorrect PINs. Try again in five minutes.' }); return; }
  const pin = String(req.body?.pin || '');
  if (!/^\d{4}$/.test(pin) || !await bcrypt.compare(pin, pinHash)) {
    const count = previous && previous.until > now ? previous.count + 1 : 1;
    attempts.set(key, { count, until: now + 5 * 60 * 1000 });
    res.status(401).json({ error: 'Incorrect Sales & Analytics PIN' }); return;
  }
  attempts.delete(key);
  res.json({ token: jwt.sign({ sub: key, purpose: 'owner-analytics' }, JWT_SECRET, { audience: 'owner-analytics', expiresIn: '10m' }), expiresIn: 600 });
}
export function requireAnalyticsUnlock(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'OWNER') { res.status(403).json({ error: 'Owner access required' }); return; }
  try {
    const value = jwt.verify(String(req.headers['x-analytics-token'] || ''), JWT_SECRET, { audience: 'owner-analytics' }) as jwt.JwtPayload;
    if (value.sub !== req.user.id || value.purpose !== 'owner-analytics') throw Error('Wrong owner');
    next();
  } catch { res.status(403).json({ error: 'Unlock Sales & Analytics with its PIN' }); }
}
