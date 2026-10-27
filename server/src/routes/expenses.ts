import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireManagerOrOwner } from '../middleware/auth.js';
import { amount, terminalId } from '../security.js';
import { transaction, lockBranch } from '../services/transactionService.js';
import { logActivity } from '../services/activityService.js';
const router = Router();
// List daily expenses
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { branchId, category, date, startDate, endDate } = req.query;
        const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
            ? (branchId as string)
            : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? undefined : req.user?.branchId || undefined);
        const where: any = {};
        if (targetBranchId)
            where.branchId = targetBranchId;
        if (category && category !== 'all')
            where.category = category as string;
        if (date) {
            const d = new Date(date as string);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            where.createdAt = { gte: start, lte: end };
        }
        else if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }
        const expenses = await prisma.expense.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true, code: true } },
                shift: { select: { id: true, cashier: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        res.json({
            totalAmount,
            count: expenses.length,
            expenses,
        });
    }
    catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const expense = await transaction(async (tx) => {
            const b = req.body;
            const branchId = b.branchId || req.user!.branchId;
            if (!branchId)
                throw new Error('Choose a branch');
            await lockBranch(tx, branchId);
            const source = b.paymentSource || 'CASH_DRAWER';
            if (!['CASH_DRAWER', 'BANK_MPESA'].includes(source) || !String(b.description || '').trim())
                throw new Error('Description and valid payment source required');
            if (!['MARKET_PRODUCE', 'GAS_CHARCOAL', 'COOKING_OIL', 'DAILY_WAGES', 'UTILITIES', 'REPAIRS', 'TRANSPORT_BODA', 'OTHER'].includes(b.category))
                throw new Error('Invalid expense category');
            const shift = await tx.shift.findFirst({ where: { branchId, status: 'OPEN', terminalId } });
            if (source === 'CASH_DRAWER' && !shift)
                throw new Error('Open a shift before paying from the cash drawer');
            if (b.shiftId && b.shiftId !== shift?.id)
                throw new Error('Expense shift does not match the open branch shift');
            const expense = await tx.expense.create({ data: { branchId, shiftId: shift?.id || null, category: b.category, amount: amount(b.amount), description: b.description, paidTo: b.paidTo || null, paymentSource: source, receiptNumber: b.receiptNumber || null }, include: { branch: true } });
            if (source === 'CASH_DRAWER' && shift) {
                await tx.cashMovement.create({ data: { expenseId: expense.id, shiftId: shift.id, branchId, type: 'PAYOUT', amount: expense.amount, reason: 'Expense: ' + expense.description, authorizedBy: req.user!.name } });
                await tx.shift.update({ where: { id: shift.id }, data: { totalExpensesPaid: { increment: expense.amount } } });
            }
            await logActivity(tx, req.user!, 'EXPENSE_CREATED', 'EXPENSE', expense.id, branchId, shift?.id || null, { amount: expense.amount, description: expense.description, paymentSource: source });
            return expense;
        });
        res.status(201).json(expense);
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.delete('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        await transaction(async (tx) => {
            const expense = await tx.expense.findUniqueOrThrow({ where: { id: String(req.params.id) } });
            await lockBranch(tx, expense.branchId);
            const shift = expense.shiftId ? await tx.shift.findUnique({ where: { id: expense.shiftId } }) : null;
            if (shift?.status === 'CLOSED')
                throw new Error('Closed-shift expenses require an owner adjustment');
            if (expense.paymentSource === 'CASH_DRAWER') {
                const movement = await tx.cashMovement.findUnique({ where: { expenseId: expense.id } });
                if (!movement)
                    throw new Error('Legacy drawer expense requires manual reconciliation');
                await tx.cashMovement.delete({ where: { id: movement.id } });
                if (shift)
                    await tx.shift.update({ where: { id: shift.id }, data: { totalExpensesPaid: { decrement: expense.amount } } });
            }
            await logActivity(tx, req.user!, 'EXPENSE_REVERSED', 'EXPENSE', expense.id, expense.branchId, expense.shiftId, { amount: expense.amount, description: expense.description });
            await tx.expense.delete({ where: { id: expense.id } });
        });
        res.json({ message: 'Expense reversed' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
export default router;
