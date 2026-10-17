import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get active shift for current user and branch
router.get('/current', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const branchId = req.user?.role === 'OWNER' && req.query.branchId && req.query.branchId !== 'all'
      ? (req.query.branchId as string)
      : (req.user?.branchId || undefined);

    let shift = await prisma.shift.findFirst({
      where: {
        ...(branchId ? { branchId } : {}),
        status: 'OPEN',
      },
      include: {
        cashier: { select: { id: true, name: true, role: true } },
        branch: true,
        cashMovements: { orderBy: { createdAt: 'desc' } },
        expenses: { orderBy: { createdAt: 'desc' } },
        orders: {
          where: { status: 'COMPLETED' },
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) {
      res.json({ activeShift: null });
      return;
    }

    // Auto-link any orphan completed orders from this branch during the shift duration
    await prisma.order.updateMany({
      where: {
        branchId: shift.branchId,
        shiftId: null,
        status: 'COMPLETED',
        createdAt: { gte: shift.openedAt },
      },
      data: {
        shiftId: shift.id,
      },
    });

    // Re-fetch shift orders to ensure all linked orders are included
    const allShiftOrders = await prisma.order.findMany({
      where: { shiftId: shift.id, status: 'COMPLETED' },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });

    // Compute food items sold aggregation
    const itemMap = new Map<string, { itemName: string; variantName: string | null; quantity: number; totalPrice: number }>();
    let actualCash = 0;
    let actualMpesa = 0;
    let actualCard = 0;

    allShiftOrders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.itemName}___${item.variantName || ''}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalPrice += item.totalPrice;
        } else {
          itemMap.set(key, {
            itemName: item.itemName,
            variantName: item.variantName || null,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          });
        }
      });

      order.payments.forEach(p => {
        if (p.paymentMethod === 'CASH') actualCash += p.amount;
        else if (p.paymentMethod === 'MPESA') actualMpesa += p.amount;
        else if (p.paymentMethod === 'CARD') actualCard += p.amount;
        else if (p.paymentMethod === 'SPLIT') {
          if (p.mpesaCode) actualMpesa += p.amount;
          else actualCash += p.amount;
        }
      });
    });

    const itemsSold = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);

    // Compute expected cash in drawer in real-time
    const cashDrops = shift.cashMovements
      .filter(m => m.type === 'CASH_DROP' || m.type === 'PAYOUT')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashAdditions = shift.cashMovements
      .filter(m => m.type === 'FLOAT_IN')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalCash = Math.max(shift.totalCashSales, actualCash);
    const totalMpesa = Math.max(shift.totalMpesaSales, actualMpesa);
    const totalCard = Math.max(shift.totalCardSales, actualCard);

    const expectedCash = shift.openingFloat + totalCash + cashAdditions - cashDrops;

    res.json({
      activeShift: {
        ...shift,
        totalCashSales: totalCash,
        totalMpesaSales: totalMpesa,
        totalCardSales: totalCard,
        orders: allShiftOrders,
        itemsSold,
        cashDrops,
        cashAdditions,
        expectedCash,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Open Shift
router.post('/open', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, openingFloat, notes } = req.body;
    const targetBranchId = branchId || req.user?.branchId;

    if (!targetBranchId) {
      res.status(400).json({ error: 'Branch is required to open a shift' });
      return;
    }

    // Check if there is already an open shift for this branch
    const existing = await prisma.shift.findFirst({
      where: {
        branchId: targetBranchId,
        status: 'OPEN',
      },
    });

    if (existing) {
      res.status(400).json({
        error: 'There is already an open shift at this branch. Please close it first.',
        activeShift: existing,
      });
      return;
    }

    const floatAmt = openingFloat !== undefined ? parseFloat(openingFloat) : 0;

    const newShift = await prisma.shift.create({
      data: {
        branchId: targetBranchId,
        cashierId: req.user!.id,
        openingFloat: floatAmt,
        status: 'OPEN',
        notes: notes || null,
      },
      include: {
        branch: true,
        cashier: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      message: `Shift opened successfully with KES ${floatAmt.toLocaleString()} opening float`,
      shift: newShift,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Cash Movement (Cash drop to safe, extra float in, emergency payout)
router.post('/cash-movement', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shiftId, type, amount, reason } = req.body;

    if (!shiftId || !type || !amount || !reason) {
      res.status(400).json({ error: 'Shift, movement type, amount, and reason are required' });
      return;
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status !== 'OPEN') {
      res.status(400).json({ error: 'Active open shift required' });
      return;
    }

    const movement = await prisma.cashMovement.create({
      data: {
        shiftId,
        branchId: shift.branchId,
        type, // FLOAT_IN, CASH_DROP, PAYOUT
        amount: parseFloat(amount),
        reason,
        authorizedBy: req.user?.name,
      },
    });

    res.status(201).json({
      message: 'Cash movement logged',
      movement,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Close Shift & Generate Z-Report
router.post('/close', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shiftId, closingCashActual, notes } = req.body;

    if (!shiftId || closingCashActual === undefined) {
      res.status(400).json({ error: 'Shift ID and counted closing cash are required' });
      return;
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        cashMovements: true,
        orders: { where: { status: 'COMPLETED' }, include: { payments: true } },
        expenses: true,
        branch: true,
        cashier: { select: { id: true, name: true, role: true } },
      },
    });

    if (!shift || shift.status !== 'OPEN') {
      res.status(400).json({ error: 'Open shift not found or already closed' });
      return;
    }

    const actualCount = parseFloat(closingCashActual);

    // Calculate payouts and float movements
    const cashDrops = shift.cashMovements
      .filter(m => m.type === 'CASH_DROP' || m.type === 'PAYOUT')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashAdditions = shift.cashMovements
      .filter(m => m.type === 'FLOAT_IN')
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedCash = shift.openingFloat + shift.totalCashSales + cashAdditions - cashDrops;
    const variance = actualCount - expectedCash; // Negative = Shortage, Positive = Overage

    const closedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingCashActual: actualCount,
        closingCashExpected: expectedCash,
        variance,
        notes: notes || shift.notes,
      },
      include: {
        branch: true,
        cashier: { select: { id: true, name: true } },
        cashMovements: true,
      },
    });

    // Detailed Z-Report payload
    const zReport = {
      zReportNumber: `Z-${closedShift.branch.code}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${closedShift.id.slice(-4).toUpperCase()}`,
      branchName: closedShift.branch.name,
      branchCode: closedShift.branch.code,
      tillNumber: closedShift.branch.tillNumber,
      cashierName: closedShift.cashier.name,
      openedAt: closedShift.openedAt,
      closedAt: closedShift.closedAt,
      openingFloat: closedShift.openingFloat,
      totalCashSales: closedShift.totalCashSales,
      totalMpesaSales: closedShift.totalMpesaSales,
      totalCardSales: closedShift.totalCardSales,
      totalGrossSales: closedShift.totalCashSales + closedShift.totalMpesaSales + closedShift.totalCardSales,
      cashMovements: shift.cashMovements,
      totalCashDrops: cashDrops,
      totalCashAdditions: cashAdditions,
      expectedCashInDrawer: expectedCash,
      actualCountedCash: actualCount,
      variance,
      isBalanced: Math.abs(variance) < 0.01,
      totalOrdersCount: shift.orders.length,
      notes: closedShift.notes,
    };

    res.json({
      message: 'Shift closed successfully. Z-Report generated.',
      shift: closedShift,
      zReport,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List past shifts
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, limit = 30 } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? undefined : req.user?.branchId || undefined);

    // Auto-purge closed shifts and Z-reports older than 3 weeks (21 days) to prevent database congestion
    const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    await prisma.shift.deleteMany({
      where: {
        status: 'CLOSED',
        closedAt: { lt: threeWeeksAgo },
      },
    }).catch(() => {});

    const where: any = targetBranchId ? { branchId: targetBranchId } : {};

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        branch: true,
        cashier: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: parseInt(limit as string, 10) || 30,
    });

    res.json(shifts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
