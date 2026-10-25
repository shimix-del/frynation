import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import prisma from '../prisma.js';
import { JWT_SECRET } from '../config.js';
import { authenticateToken, AuthenticatedRequest, requireOwner, requireManagerOrOwner } from '../middleware/auth.js';

const router = Router();

const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

// Login with Email/Password or PIN Code
router.post('/login', async (req, res): Promise<void> => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const lockoutKey = `auth_lockout_${clientIp}`;
    const attemptRecord = failedAttemptsMap.get(lockoutKey);

    if (attemptRecord && attemptRecord.lockedUntil > Date.now()) {
      const remainingSecs = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 1000);
      res.status(429).json({
        error: `Security Lockout: 3 failed attempts exceeded. Access blocked for ${remainingSecs}s to prevent unauthorized access.`,
      });
      return;
    }

    const { email, password, pinCode, branchId } = req.body;

    let user;

    if (pinCode) {
      // PIN code login (for fast cashier touchscreen POS login)
      const candidates = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(branchId && branchId !== 'all' ? { OR: [{ branchId }, { role: 'OWNER' }] } : {}),
        },
        include: { branch: true },
      });
      const entered = pinCode.toString().trim();
      if (!/^\d{4,8}$/.test(entered)) { res.status(400).json({ error: 'Enter a valid staff PIN' }); return; }
      for (const candidate of candidates) {
        const matches = /^\$2[aby]\$/.test(candidate.pinCode)
          ? await bcrypt.compare(entered, candidate.pinCode) : candidate.pinCode === entered;
        if (matches) { user = candidate; break; }
      }

      if (!user) {
        const curCount = (attemptRecord && attemptRecord.lockedUntil > 0 && attemptRecord.lockedUntil <= Date.now() ? 0 : attemptRecord?.count || 0) + 1;
        if (curCount >= 3) {
          failedAttemptsMap.set(lockoutKey, { count: 3, lockedUntil: Date.now() + 5 * 60 * 1000 });
          res.status(429).json({ error: '3 failed attempts exceeded. Access blocked for 5 minutes.' });
        } else {
          failedAttemptsMap.set(lockoutKey, { count: curCount, lockedUntil: 0 });
          res.status(401).json({ error: `Invalid PIN code. ${3 - curCount} attempt(s) remaining before 5-minute lockout.` });
        }
        return;
      }
    } else if (email && password) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { branch: true },
      });

      if (!user || !user.isActive) {
        const curCount = (attemptRecord && attemptRecord.lockedUntil > 0 && attemptRecord.lockedUntil <= Date.now() ? 0 : attemptRecord?.count || 0) + 1;
        if (curCount >= 3) {
          failedAttemptsMap.set(lockoutKey, { count: 3, lockedUntil: Date.now() + 5 * 60 * 1000 });
          res.status(429).json({ error: '3 failed attempts exceeded. Access blocked for 5 minutes.' });
        } else {
          failedAttemptsMap.set(lockoutKey, { count: curCount, lockedUntil: 0 });
          res.status(401).json({ error: `Invalid credentials. ${3 - curCount} attempt(s) remaining before 5-minute lockout.` });
        }
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        const curCount = (attemptRecord && attemptRecord.lockedUntil > 0 && attemptRecord.lockedUntil <= Date.now() ? 0 : attemptRecord?.count || 0) + 1;
        if (curCount >= 3) {
          failedAttemptsMap.set(lockoutKey, { count: 3, lockedUntil: Date.now() + 5 * 60 * 1000 });
          res.status(429).json({ error: '3 failed attempts exceeded. Access blocked for 5 minutes.' });
        } else {
          failedAttemptsMap.set(lockoutKey, { count: curCount, lockedUntil: 0 });
          res.status(401).json({ error: `Invalid credentials. ${3 - curCount} attempt(s) remaining before 5-minute lockout.` });
        }
        return;
      }
    } else {
      res.status(400).json({ error: 'Provide either email & password or PIN code' });
      return;
    }

    // Reset failed attempts on success
    failedAttemptsMap.delete(lockoutKey);

    // Only one cashier can run a shift at a time; two shifts cannot run concurrently
    if (user.role === 'CASHIER') {
      const activeShift = await prisma.shift.findFirst({
        where: {
          status: 'OPEN',
          ...(user.branchId ? { branchId: user.branchId } : {}),
        },
        include: { cashier: true },
      });

      if (activeShift && activeShift.cashierId !== user.id) {
        const activeName = activeShift.cashier?.name || 'Another cashier';
        res.status(403).json({
          error: `Shift in Progress: ${activeName} is currently on an active shift. Only one cashier can run a shift at a time. Two shifts cannot run concurrently. ${activeName} must close their shift first.`,
        });
        return;
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        credentialTag: createHash('sha256').update(user.pinCode).digest('hex'),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || 'All Branches (Central HQ)',
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Current User profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { branch: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || 'All Branches (Central HQ)',
      branch: user.branch,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all staff members
router.get('/users', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const whereClause = req.user?.role === 'OWNER' ? {} : { branchId: req.user?.branchId };

    const users = await prisma.user.findMany({
      where: whereClause,
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        branchId: u.branchId,
        branchName: u.branch?.name || 'Central HQ',
        isActive: u.isActive,
        createdAt: u.createdAt,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new staff member
router.post('/users', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, pinCode, password, branchId } = req.body;

    if (req.user?.role !== 'OWNER') { res.status(403).json({ error: 'Only the owner can manage staff access' }); return; }
    if (!/^\d{4}$/.test(String(pinCode || '')) || !['OWNER', 'MANAGER', 'CASHIER'].includes(role || 'CASHIER')) {
      res.status(400).json({ error: 'Choose a valid role and a four-digit PIN' }); return;
    }
    for (const existingUser of await prisma.user.findMany({ where: { isActive: true } })) {
      const duplicate = /^\$2[aby]\$/.test(existingUser.pinCode) ? await bcrypt.compare(String(pinCode), existingUser.pinCode) : existingUser.pinCode === String(pinCode);
      if (duplicate) { res.status(400).json({ error: 'That PIN is already assigned. Choose another PIN.' }); return; }
    }

    if (!name || !email || !pinCode) {
      res.status(400).json({ error: 'Name, email, and PIN code are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || pinCode || '123456', salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role: role || 'CASHIER',
        pinCode: await bcrypt.hash(pinCode.toString().trim(), 12),
        passwordHash,
        branchId: branchId || (req.user?.role === 'OWNER' ? null : req.user?.branchId),
      },
      include: { branch: true },
    });

    res.status(201).json({
      message: 'Staff member created',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        branchName: newUser.branch?.name || 'Central HQ',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/users/:id', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, phone, role, branchId, pinCode, isActive } = req.body;
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) { res.status(404).json({ error: 'Staff member not found' }); return; }
    if (id === req.user!.id && (isActive === false || role && role !== 'OWNER')) {
      res.status(400).json({ error: 'You cannot deactivate or demote your own owner account' }); return;
    }
    if (role && !['OWNER', 'MANAGER', 'CASHIER'].includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
    const data: any = {};
    for (const [key, value] of Object.entries({ name, email, phone, role, branchId, isActive })) if (value !== undefined) data[key] = value;
    if (data.email) data.email = String(data.email).trim().toLowerCase();
    if (isActive !== undefined && typeof isActive !== 'boolean') { res.status(400).json({ error: 'Invalid access status' }); return; }
    if (pinCode) {
      if (!/^\d{4}$/.test(String(pinCode))) { res.status(400).json({ error: 'Use a four-digit PIN' }); return; }
      for (const other of await prisma.user.findMany({ where: { id: { not: id }, isActive: true } })) {
        if (/^\$2[aby]\$/.test(other.pinCode) ? await bcrypt.compare(String(pinCode), other.pinCode) : other.pinCode === String(pinCode)) {
          res.status(400).json({ error: 'That PIN is already assigned' }); return;
        }
      }
      data.pinCode = await bcrypt.hash(String(pinCode), 12);
    }
    await prisma.user.update({ where: { id }, data });
    res.json({ message: 'Staff access updated' });
  } catch { res.status(400).json({ error: 'Staff changes could not be saved; check the details' }); }
});

export default router;
