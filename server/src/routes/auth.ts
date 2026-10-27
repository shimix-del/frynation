import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireOwner, requireManagerOrOwner } from '../middleware/auth.js';

const router = Router();
import { JWT_SECRET, matchesPin, terminalId } from '../security.js';
import { readState } from '../replica/state.js';
import { logActivity } from '../services/activityService.js';

const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

// Login with Email/Password or PIN Code
router.post('/login', async (req, res): Promise<void> => {
  try {
    if(process.env.SITE_MODE==='shop'&&!await readState('enrolled')){res.status(503).json({error:'Shop setup is pending verified pairing with the live database'});return;}
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
      const candidates = await prisma.user.findMany({ where: { isActive: true,
        ...(branchId && branchId !== 'all' ? { OR: [{ branchId }, { role: 'OWNER' }] } : {}) }, include: { branch: true } });
      for (const candidate of candidates) {
        if (await matchesPin(String(pinCode).trim(), candidate.pinCode)) {
          if(user){res.status(409).json({error:'This PIN is assigned to multiple accounts. An owner must resolve it using email login.'});return;}
          user = candidate;
        }
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

    if (process.env.SITE_MODE !== 'cloud' && !user.pinCode.startsWith('$2')) {
      await prisma.user.update({ where: { id: user.id }, data: { pinCode: await bcrypt.hash(user.pinCode, 10) } });
    }
    const loginShift = await prisma.shift.findFirst({ where: { status: 'OPEN', terminalId, ...(user.branchId ? { branchId: user.branchId } : { cashierId: user.id }) } });
    // Reset failed attempts on success
    failedAttemptsMap.delete(lockoutKey);

    // Only one cashier can run a shift at a time; two shifts cannot run concurrently
    if (user.role === 'CASHIER') {
      const activeShift = await prisma.shift.findFirst({
        where: {
          status: 'OPEN', terminalId,
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

    await logActivity(prisma, { ...user, role: user.role as any }, 'LOGIN', 'USER', user.id, user.branchId, loginShift?.id || null);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
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
router.get('/users', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
router.post('/users', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, pinCode, password, branchId } = req.body;

    if (!name || !email || !pinCode) {
      res.status(400).json({ error: 'Name, email, and PIN code are required' });
      return;
    }

    if (!['OWNER', 'MANAGER', 'CASHIER'].includes(role || 'CASHIER') || !/^\d{4}$/.test(String(pinCode)) || ((role || 'CASHIER') !== 'OWNER' && !branchId)) {
      res.status(400).json({ error: 'Valid role, four-digit PIN, and assigned branch are required' }); return;
    }
    for (const other of await prisma.user.findMany()) {
      if (await matchesPin(String(pinCode), other.pinCode)) { res.status(400).json({ error: 'PIN already assigned' }); return; }
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
        pinCode: await bcrypt.hash(String(pinCode), 10),
        passwordHash,
        branchId: branchId || (req.user?.role === 'OWNER' ? null : req.user?.branchId),
      },
      include: { branch: true },
    });

    await logActivity(prisma, req.user!, 'STAFF_CREATED', 'USER', newUser.id, newUser.branchId, null, { role: newUser.role });
    res.status(201).json({
      message: 'Staff member created',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        branchName: newUser.branch?.name || 'Central HQ',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update staff member (email, phone, name, role, etc.)
router.put('/users/:id', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, phone, role, pinCode, branchId, isActive } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if ((role && !['OWNER', 'MANAGER', 'CASHIER'].includes(role)) || (pinCode && !/^\d{4}$/.test(String(pinCode))) || ((role || existingUser.role) !== 'OWNER' && !(branchId === undefined ? existingUser.branchId : branchId))) {
      res.status(400).json({ error: 'Valid role, PIN, and assigned branch are required' }); return;
    }
    if (pinCode) for (const other of await prisma.user.findMany({ where: { id: { not: id } } })) {
      if (await matchesPin(String(pinCode), other.pinCode)) { res.status(400).json({ error: 'PIN already assigned' }); return; }
    }
    // Check unique email if email is being changed
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const emailExists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (emailExists) {
        res.status(400).json({ error: 'Email already in use by another user' });
        return;
      }
    }

    const updatedUser: any = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email: email.toLowerCase() } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(role ? { role } : {}),
        ...(pinCode ? { pinCode: await bcrypt.hash(String(pinCode), 10) } : {}),
        ...(branchId !== undefined ? { branchId: branchId || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: { branch: true },
    });

    await logActivity(prisma, req.user!, 'STAFF_UPDATED', 'USER', id, updatedUser.branchId, null, { role: updatedUser.role, isActive: updatedUser.isActive });
    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        branchId: updatedUser.branchId,
        branchName: updatedUser.branch?.name || 'Central HQ',
        isActive: updatedUser.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.branchScopeId || req.user!.branchId;
    const shift = branchId ? await prisma.shift.findFirst({ where: { branchId, status: 'OPEN', terminalId } }) : null;
    await logActivity(prisma, req.user!, 'LOGOUT', 'USER', req.user!.id, branchId || null, shift?.id || null);
    res.json({ message: 'Logout recorded' });
  } catch { res.status(503).json({ error: 'Could not record logout' }); }
});

export default router;
