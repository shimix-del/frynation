import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireOwner } from '../middleware/auth.js';

const router = Router();

// List all branches
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({
      where: req.user?.role === 'OWNER' ? {} : { id: req.user!.branchId! },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            stockItems: true,
            orders: true,
          },
        },
      },
    });

    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single branch
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, role: true, isActive: true } },
      },
    });

    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    res.json(branch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create branch (Owner only)
router.post('/', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, address, phone, tillNumber, paybillNumber } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Branch name and unique code are required' });
      return;
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        address: address || null,
        phone: phone || null,
        tillNumber: tillNumber || null,
        paybillNumber: paybillNumber || null,
      },
    });

    res.status(201).json(branch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update branch
router.put('/:id', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, code, address, phone, tillNumber, paybillNumber, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code ? code.toUpperCase().trim() : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        tillNumber: tillNumber !== undefined ? tillNumber : undefined,
        paybillNumber: paybillNumber !== undefined ? paybillNumber : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json(branch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
