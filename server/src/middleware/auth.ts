import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import prisma from '../prisma.js';
import { JWT_SECRET } from '../config.js';

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; credentialTag?: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        pinCode: true,
      },
    });

    if (!user || !user.isActive || (decoded.credentialTag && decoded.credentialTag !== createHash('sha256').update(user.pinCode).digest('hex'))) {
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

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
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
