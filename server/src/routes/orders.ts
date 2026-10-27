import { randomBytes } from 'crypto';
import { menuPricing } from '../services/menuPricing.js';
import { amount, money, terminalId } from '../security.js';
import { transaction, lockBranch } from '../services/transactionService.js';
import { logActivity } from '../services/activityService.js';
import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { deductStockForOrder, restoreStockForOrder } from '../services/stockDeductionService.js';
const router = Router();
// List orders
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { branchId, status, search, limit = 50, date } = req.query;
        const targetBranchId = (req.user?.role === 'OWNER' && branchId && branchId !== 'all')
            ? (branchId as string)
            : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all')
                ? undefined
                : req.user?.branchId || undefined);
        const where: any = {};
        if (targetBranchId) {
            where.branchId = targetBranchId;
        }
        if (status && status !== 'all') {
            where.status = status as string;
        }
        if (search) {
            where.OR = [
                { orderNumber: { contains: search as string } },
                { customerName: { contains: search as string } },
                { customerPhone: { contains: search as string } },
                { tableNumber: { contains: search as string } },
            ];
        }
        if (date) {
            const d = new Date(date as string);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            where.createdAt = { gte: start, lte: end };
        }
        const orders = await prisma.order.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true, code: true, tillNumber: true } },
                cashier: { select: { id: true, name: true } },
                items: true,
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string, 10) || 50,
        });
        res.json(orders);
    }
    catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// Get held orders for quick recall
router.get('/held', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const branchId = req.user?.role === 'OWNER' && req.query.branchId && req.query.branchId !== 'all'
            ? (req.query.branchId as string)
            : (req.user?.branchId || undefined);
        const heldOrders = await prisma.order.findMany({
            where: {
                status: 'HELD',
                ...(branchId ? { branchId } : {}),
            },
            include: {
                cashier: { select: { id: true, name: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(heldOrders);
    }
    catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// Get single order
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                branch: true,
                cashier: { select: { id: true, name: true } },
                items: {
                    include: {
                        menuItem: true,
                        variant: true,
                    },
                },
                payments: true,
            },
        });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        res.json(order);
    }
    catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
const includeOrder = { items: true, payments: true, branch: true, cashier: { select: { id: true, name: true } } };
async function pricedItems(tx: any, items: any[]) {
    if (!Array.isArray(items) || !items.length)
        throw new Error('At least one item is required');
    return Promise.all(items.map(async (input: any) => {
        const quantity = Number(input.quantity);
        if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 10000)
            throw new Error('Quantity must be a positive whole number');
        const menu = await tx.menuItem.findUnique({ where: { id: input.menuItemId }, include: { variants: true } });
        if (!menu?.isAvailable)
            throw new Error('Menu item is unavailable');
        const variant = input.variantId ? menu.variants.find((v: any) => v.id === input.variantId) : null;
        if (input.variantId && (!variant || !variant.isAvailable))
            throw new Error('Invalid or unavailable variant');
        const pricing = menuPricing(menu.name);
        if (menu.hasVariants && !variant && pricing === 'fixed')
            throw new Error('Choose an item variant');
        const unitPrice = pricing === 'fixed' ? amount(variant?.price ?? menu.basePrice, 'Price', true) : amount(input.unitPrice, 'Selling price');
        if (pricing !== 'fixed' && unitPrice <= 0) throw new Error('Selling price must be at least KSh 0.01');
        if (pricing === 'soda' && ![50, 70].includes(unitPrice)) throw new Error('Choose KSh 50 or KSh 70 for this soda');
        if (pricing === 'fixed' && input.unitPrice !== undefined && amount(input.unitPrice, 'Price', true) !== unitPrice)
            throw new Error('Menu price changed. Review this order before payment');
        return { menuItemId: menu.id, variantId: variant?.id || null, itemName: menu.name, variantName: pricing === 'soda' ? `KSh ${unitPrice}` : variant?.name || null,
            quantity, unitPrice, unitCost: amount(variant?.costPrice ?? menu.costPrice, 'Cost', true), totalPrice: money(quantity * unitPrice), notes: input.notes || null };
    }));
}
function validatedPayments(input: any, total: number) {
    if (!Array.isArray(input) || !input.length) {
        if (total === 0)
            return [];
        throw new Error('Payment details are required');
    }
    const result = input.map((p: any) => {
        if (!['CASH', 'MPESA', 'CARD'].includes(p.paymentMethod))
            throw new Error('Invalid payment method');
        const paid = amount(p.amount);
        const mpesaCode = String(p.mpesaCode || '').trim().toUpperCase();
        if (p.paymentMethod === 'MPESA' && mpesaCode && !/^[A-Z0-9]{8,20}$/.test(mpesaCode))
            throw new Error('Enter the actual M-Pesa transaction reference');
        if (p.paymentMethod === 'CARD' && !String(p.cardRef || '').trim())
            throw new Error('Card payment reference is required');
        const tendered = p.paymentMethod === 'CASH' ? amount(p.cashTendered ?? paid, 'Cash tendered', true) : null;
        if (tendered !== null && tendered < paid)
            throw new Error('Cash tendered is insufficient');
        return { amount: paid, paymentMethod: p.paymentMethod, mpesaCode: p.paymentMethod === 'MPESA' ? mpesaCode || null : null,
            cardRef: p.paymentMethod === 'CARD' ? String(p.cardRef).trim() : null, cashTendered: tendered, changeAmount: tendered === null ? null : money(tendered - paid), status: 'COMPLETED' };
    });
    if (money(result.reduce((sum: number, p: any) => sum + p.amount, 0)) !== total)
        throw new Error('Payments must equal the order total');
    return result;
}
async function updateShift(tx: any, shiftId: string, payments: any[], sign = 1) {
    const sum = (method: string) => money(payments.filter(p => p.paymentMethod === method && p.status !== 'REFUNDED').reduce((n, p) => n + p.amount, 0) * sign);
    await tx.shift.update({ where: { id: shiftId }, data: { totalCashSales: { increment: sum('CASH') }, totalMpesaSales: { increment: sum('MPESA') }, totalCardSales: { increment: sum('CARD') } } });
}
async function checkout(req: AuthenticatedRequest, res: Response, heldId?: string) {
    try {
        const user = req.user!;
        const body = req.body;
        if (typeof body.clientRequestId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.clientRequestId))
            throw new Error('A valid request ID is required');
        const result = await transaction(async (tx) => {
            const previous = await tx.order.findUnique({ where: { clientRequestId: body.clientRequestId }, include: includeOrder });
            if (previous) {
                if (previous.cashierId !== user.id || (user.role !== 'OWNER' && previous.branchId !== user.branchId))
                    throw new Error('Request ID belongs to another user');
                return { order: previous, warnings: [] as string[] };
            }
            const old = heldId ? await tx.order.findUnique({ where: { id: heldId }, include: { items: true } }) : null;
            const branchId = old?.branchId || body.branchId || user.branchId;
            if (!branchId || (user.role !== 'OWNER' && branchId !== user.branchId))
                throw new Error('Invalid branch');
            await lockBranch(tx, branchId);
            if (heldId && old?.status !== 'HELD')
                throw new Error('This held order has already been processed');
            const held = !heldId && body.isHeld === true;
            const shift = await tx.shift.findFirst({ where: { branchId, status: 'OPEN', terminalId } });
            if (!shift || (user.role === 'CASHIER' && shift.cashierId !== user.id))
                throw new Error('Your branch must have an authorized open shift');
            if (body.shiftId && body.shiftId !== shift.id)
                throw new Error('Original shift is closed. This pending sale requires owner review');
            if (body.cashierId && body.cashierId !== user.id)
                throw new Error('Sign in as the original cashier to synchronize this order');
            const items = await pricedItems(tx, body.items || old?.items);
            const subtotal = money(items.reduce((sum, i) => sum + i.totalPrice, 0));
            const discount = amount(body.discountAmount ?? old?.discountAmount ?? 0, 'Discount', true);
            if (discount > subtotal)
                throw new Error('Discount cannot exceed the subtotal');
            if (discount > 0 && (!String(body.discountReason || old?.discountReason || '').trim() || user.role === 'CASHIER'))
                throw new Error('A manager or owner must authorize a discount with a reason');
            const totalAmount = money(subtotal - discount);
            const payments = held ? [] : validatedPayments(body.payments, totalAmount);
            const data = { clientRequestId: body.clientRequestId, branchId, cashierId: user.id, shiftId: shift.id,
                orderType: body.orderType || old?.orderType || 'DINE_IN', tableNumber: body.tableNumber || old?.tableNumber || null,
                customerName: body.customerName || old?.customerName || null, customerPhone: body.customerPhone || old?.customerPhone || null,
                status: held ? 'HELD' : 'COMPLETED', subtotal, discountAmount: discount, discountReason: body.discountReason || old?.discountReason || null,
                totalAmount, notes: body.notes || old?.notes || null, isOfflineSynced: !!body.isOfflineSynced };
            if (!['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(data.orderType))
                throw new Error('Invalid order type');
            const order = heldId ? await tx.order.update({ where: { id: heldId }, data: { ...data, items: { deleteMany: {}, create: items } } })
                : await tx.order.create({ data: { ...data, orderNumber: 'NF-' + randomBytes(8).toString('hex').toUpperCase(), items: { create: items } } });
            let warnings: string[] = [];
            if (!held) {
                for (const p of payments) {
                    if (p.mpesaCode && await tx.payment.findFirst({ where: { mpesaCode: p.mpesaCode, status: 'COMPLETED' } }))
                        throw new Error('M-Pesa reference already recorded');
                    await tx.payment.create({ data: { ...p, orderId: order.id, branchId } });
                }
                warnings = (await deductStockForOrder(tx, branchId, items, order.id, shift.id, user)).warnings;
                await updateShift(tx, shift.id, payments);
            }
            await logActivity(tx, user, held ? 'ORDER_HELD' : heldId ? 'ORDER_RESUMED' : 'ORDER_COMPLETED', 'ORDER', order.id, branchId, shift.id, { totalAmount, discountAmount: discount, itemCount: items.length });
            return { order: await tx.order.findUnique({ where: { id: order.id }, include: includeOrder }), warnings };
        });
        res.status(201).json({ ...result, message: 'Order saved' });
    }
    catch (err: any) {
        if (err.code === 'P2002' && req.body.clientRequestId) {
            const previous = await prisma.order.findUnique({ where: { clientRequestId: req.body.clientRequestId }, include: includeOrder });
            if (previous && previous.cashierId === req.user!.id) {
                res.json({ order: previous, warnings: [], message: 'Order already saved' });
                return;
            }
        }
        res.status(400).json({ error: err.message || 'Checkout failed' });
    }
}
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => checkout(req, res));
router.patch('/:id/resume', authenticateToken, (req: AuthenticatedRequest, res: Response) => checkout(req, res, String(req.params.id)));
router.delete('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const order = await transaction(async (tx) => {
            const found = await tx.order.findUnique({ where: { id: String(req.params.id) } });
            if (!found)
                throw new Error('Order not found');
            await lockBranch(tx, found.branchId);
            const current = await tx.order.findUniqueOrThrow({ where: { id: found.id }, include: { payments: true } });
            if (current.status === 'CANCELLED')
                return current;
            if (current.status === 'COMPLETED') {
                if (req.user!.role === 'CASHIER')
                    throw new Error('A manager or owner must cancel completed sales');
                const shift = current.shiftId ? await tx.shift.findUnique({ where: { id: current.shiftId } }) : null;
                if (!shift || shift.status !== 'OPEN')
                    throw new Error('Closed-shift sales require an owner adjustment; historical Z-reports cannot be rewritten');
                if (!current.clientRequestId)
                    throw new Error('Legacy sale requires manual stock and refund reconciliation');
                await restoreStockForOrder(tx, current.id, current.branchId, current.shiftId, req.user!);
                await updateShift(tx, shift.id, current.payments, -1);
                await tx.payment.updateMany({ where: { orderId: current.id }, data: { status: 'REFUNDED' } });
            }
            const updated = await tx.order.update({ where: { id: current.id }, data: { status: 'CANCELLED' }, include: includeOrder });
            await logActivity(tx, req.user!, 'ORDER_CANCELLED', 'ORDER', current.id, current.branchId, current.shiftId, { totalAmount: current.totalAmount });
            return updated;
        });
        res.json({ order, message: 'Order cancelled; payment reversal recorded. Settle any customer refund separately.' });
    }
    catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});
export default router;
