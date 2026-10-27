import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

import { JWT_SECRET } from '../security.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  branchId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  branchScopeId?: string | null;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User is inactive or not found' });
      return;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'OWNER' | 'MANAGER' | 'CASHIER',
      branchId: user.branchId,
    };

    // Determine branch scope: if owner and 'x-branch-id' header provided, use that; else user's branch
    const requestedBranchId = (req.headers['x-branch-id'] as string) || (req.query.branchId as string);
    if (user.role === 'OWNER' && requestedBranchId && requestedBranchId !== 'all') {
      req.branchScopeId = requestedBranchId;
    } else if (user.role === 'OWNER') {
      req.branchScopeId = null; // signifies all branches
    } else {
      req.branchScopeId = user.branchId;
    }

    if (!await enforceScope(req, res)) return;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else res.status(503).json({ error: 'Authentication service unavailable. Please retry.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

export const requireOwner = requireRole(['OWNER']);
export const requireManagerOrOwner = requireRole(['OWNER', 'MANAGER']);

async function enforceScope(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  const user = req.user!;
  if (user.role === 'OWNER') return true;
  const deny = () => { res.status(403).json({ error: 'Access denied for this branch or action' }); return false; };
  if (!user.branchId) return deny();
  for (const requested of [req.body?.branchId, req.query.branchId, req.headers['x-branch-id'], req.body?.sourceBranchId]) {
    if (requested && requested !== user.branchId) return deny();
  }
  if (req.baseUrl.endsWith('/auth') && req.path.startsWith('/users')) return deny();
  if (req.baseUrl.endsWith('/reports') && (user.role === 'CASHIER' || req.path === '/branch-comparison')) return deny();
  if (req.baseUrl.endsWith('/recipes') && req.method !== 'GET') return deny();
  if (req.baseUrl.endsWith('/branches') && req.params.id && req.params.id !== user.branchId) return deny();
  let record: any;
  if (req.baseUrl.endsWith('/orders') && req.params.id) record = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
  if (req.baseUrl.endsWith('/inventory') && (req.params.id || req.body?.stockItemId)) record = await prisma.stockItem.findUnique({ where: { id: String(req.params.id || req.body.stockItemId) } });
  if (req.baseUrl.endsWith('/expenses') && req.params.id) record = await prisma.expense.findUnique({ where: { id: String(req.params.id) } });
  if (req.baseUrl.endsWith('/shifts') && req.body?.shiftId) {
    record = await prisma.shift.findUnique({ where: { id: String(req.body.shiftId) } });
    if (record && user.role === 'CASHIER' && record.cashierId !== user.id) return deny();
  }
  if (record && record.branchId !== user.branchId) return deny();
  return true;
}
