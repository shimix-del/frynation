import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { amount, money, terminalId } from '../security.js';
import { transaction, lockBranch } from '../services/transactionService.js';
import { summarizeShift, shiftInclude } from '../services/shiftService.js';
import { logActivity } from '../services/activityService.js';
const router = Router();
router.get('/current', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const shift = await prisma.shift.findFirst({ where: { ...(req.branchScopeId ? { branchId: req.branchScopeId } : {}), status: 'OPEN', terminalId }, include: shiftInclude, orderBy: { openedAt: 'desc' } });
        res.json({ activeShift: shift ? summarizeShift(shift) : null });
    }
    catch {
        res.status(500).json({ error: 'Could not load shift' });
    }
});
router.post('/open', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const shift = await transaction(async (tx) => {
            const branchId = req.body.branchId || req.user!.branchId;
            if (!branchId)
                throw new Error('Choose a branch');
            await lockBranch(tx, branchId);
            if (await tx.shift.findFirst({ where: { branchId, status: 'OPEN', terminalId } }))
                throw new Error('There is already an open shift at this branch');
            const shift = await tx.shift.create({ data: { branchId, terminalId, cashierId: req.user!.id, openingFloat: amount(req.body.openingFloat ?? 0, 'Opening float', true), notes: req.body.notes || null }, include: shiftInclude });
            await logActivity(tx, req.user!, 'SHIFT_OPENED', 'SHIFT', shift.id, branchId, shift.id, { openingFloat: shift.openingFloat });
            return shift;
        });
        res.status(201).json({ message: 'Shift opened', shift });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.post('/cash-movement', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const movement = await transaction(async (tx) => {
            const found = await tx.shift.findUniqueOrThrow({ where: { id: req.body.shiftId } });
            await lockBranch(tx, found.branchId);
            const shift = await tx.shift.findUniqueOrThrow({ where: { id: found.id } });
            if (shift.status !== 'OPEN')
                throw new Error('An open shift is required');
            const { type, reason } = req.body;
            if (!['FLOAT_IN', 'CASH_DROP', 'PAYOUT'].includes(type) || !String(reason || '').trim())
                throw new Error('Valid movement type and reason required');
            const movement = await tx.cashMovement.create({ data: { shiftId: shift.id, branchId: shift.branchId, type, amount: amount(req.body.amount), reason, authorizedBy: req.user!.name } });
            await logActivity(tx, req.user!, 'CASH_' + type, 'CASH_MOVEMENT', movement.id, shift.branchId, shift.id, { amount: movement.amount, reason });
            return movement;
        });
        res.status(201).json({ movement, message: 'Cash movement logged' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.post('/close', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await transaction(async (tx) => {
            const found = await tx.shift.findUniqueOrThrow({ where: { id: req.body.shiftId } });
            await lockBranch(tx, found.branchId);
            const shift = await tx.shift.findUniqueOrThrow({ where: { id: found.id }, include: shiftInclude });
            if (shift.status !== 'OPEN')
                throw new Error('Shift is already closed');
            const totals = summarizeShift(shift);
            const actual = amount(req.body.closingCashActual, 'Closing cash', true);
            const variance = money(actual - totals.expectedCash);
            const closed = await tx.shift.update({ where: { id: shift.id }, data: { status: 'CLOSED', closedAt: new Date(), closingCashActual: actual, closingCashExpected: totals.expectedCash, variance,
                    totalCashSales: totals.totalCashSales, totalMpesaSales: totals.totalMpesaSales, totalCardSales: totals.totalCardSales, notes: req.body.notes || shift.notes }, include: shiftInclude });
            await logActivity(tx, req.user!, 'SHIFT_CLOSED', 'SHIFT', shift.id, shift.branchId, shift.id, { expectedCash: totals.expectedCash, actualCash: actual, variance });
            return { shift: { ...totals, ...closed, itemsSold: totals.itemsSold }, zReport: { zReportNumber: 'Z-' + shift.branch.code + '-' + shift.id,
                    branchName: shift.branch.name, branchCode: shift.branch.code, tillNumber: shift.branch.tillNumber, cashierName: shift.cashier.name,
                    openedAt: shift.openedAt, closedAt: closed.closedAt, openingFloat: shift.openingFloat, totalCashSales: totals.totalCashSales, totalMpesaSales: totals.totalMpesaSales, totalCardSales: totals.totalCardSales,
                    totalGrossSales: money(totals.totalCashSales + totals.totalMpesaSales + totals.totalCardSales), cashMovements: shift.cashMovements, itemsSold: totals.itemsSold, totalCashDrops: totals.cashDrops, totalCashAdditions: totals.cashAdditions,
                    expectedCashInDrawer: totals.expectedCash, actualCountedCash: actual, variance, isBalanced: Math.abs(variance) < 0.01, totalOrdersCount: totals.orders.length, notes: closed.notes } };
        });
        res.json({ ...result, message: 'Shift closed' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const shifts = await prisma.shift.findMany({ where: req.branchScopeId ? { branchId: req.branchScopeId } : {}, include: shiftInclude, orderBy: { openedAt: 'desc' }, take: Math.min(200, Math.max(1, Number(req.query.limit) || 50)) });
        res.json(shifts.map(s => ({ ...summarizeShift(s), _count: { orders: s.orders.filter(o => o.status === 'COMPLETED').length } })));
    }
    catch {
        res.status(500).json({ error: 'Could not load shift history' });
    }
});
export default router;
