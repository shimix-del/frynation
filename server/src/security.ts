import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
export const terminalId = process.env.SITE_MODE === 'shop' ? 'shop:' + (process.env.REPLICA_SHOP_ID || 'main') : 'cloud';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('REPLACE'))) {
    throw new Error('Configure a unique JWT_SECRET of at least 32 characters');
}
export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET must be configured in production'); })()
    : randomBytes(48).toString('hex'));
export const matchesPin = async (pin: string, stored: string) => stored.startsWith('$2') ? bcrypt.compare(pin, stored) : pin === stored;
export function amount(value: unknown, label = 'Amount', allowZero = false): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0))
        throw new Error(label + ' must be a valid ' + (allowZero ? 'non-negative' : 'positive') + ' number');
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
