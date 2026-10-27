import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireManagerOrOwner } from '../middleware/auth.js';
import { amount, terminalId } from '../security.js';
import { transaction, lockBranch } from '../services/transactionService.js';
import { logActivity } from '../services/activityService.js';
const router = Router();
function quantity(value: any, zero = false) { const n = Number(value); if (value === '' || value == null || !Number.isFinite(n) || n < 0 || (!zero && n === 0))
    throw new Error('Invalid stock quantity'); return n; }
async function record(tx: any, req: AuthenticatedRequest, stock: any, delta: number, action: string, details: any = {}) {
    const shift = await tx.shift.findFirst({ where: { branchId: stock.branchId, status: 'OPEN', terminalId } });
    await tx.stockMovement.create({ data: { stockItemId: stock.id, stockItemName: stock.name, branchId: stock.branchId, shiftId: shift?.id || null, actorId: req.user!.id, quantity: delta, reason: action } });
    await logActivity(tx, req.user!, action, 'STOCK', stock.id, stock.branchId, shift?.id || null, { name: stock.name, quantity: delta, unit: stock.unit, ...details });
}
// List inventory / stock items for current branch scope
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { branchId, type, lowStockOnly, search } = req.query;
        const targetBranchId = (req.user?.role === 'OWNER' && branchId && branchId !== 'all')
            ? (branchId as string)
            : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all')
                ? undefined
                : req.user?.branchId || undefined);
        const where: any = {};
        if (targetBranchId) {
            where.branchId = targetBranchId;
        }
        if (type && type !== 'all') {
            where.type = type as string;
        }
        if (search) {
            where.name = { contains: search as string };
        }
        const items = await prisma.stockItem.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true, code: true } },
            },
            orderBy: [{ branchId: 'asc' }, { name: 'asc' }],
        });
        let result = items.map(item => ({
            ...item,
            isLowStock: item.currentStock <= item.minStockAlert,
            stockValue: item.currentStock * item.unitCost,
        }));
        if (lowStockOnly === 'true') {
            result = result.filter(item => item.isLowStock);
        }
        res.json(result);
    }
    catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const item = await transaction(async (tx) => {
            const b = req.body;
            const branchId = b.branchId || req.user!.branchId;
            if (!branchId || !String(b.name || '').trim() || !b.unit)
                throw new Error('Branch, stock name and unit required');
            await lockBranch(tx, branchId);
            const item = await tx.stockItem.create({ data: { branchId, name: b.name.trim(), sku: b.sku || null, type: b.type || 'RAW_INGREDIENT', unit: b.unit, currentStock: quantity(b.currentStock ?? 0, true), minStockAlert: quantity(b.minStockAlert ?? 5, true), unitCost: amount(b.unitCost ?? 0, 'Unit cost', true), supplierName: b.supplierName || null }, include: { branch: true } });
            await record(tx, req, item, item.currentStock, 'STOCK_CREATED');
            return item;
        });
        res.status(201).json(item);
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.post('/restock', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const item = await transaction(async (tx) => {
            const b = req.body;
            const found = await tx.stockItem.findUniqueOrThrow({ where: { id: b.stockItemId } });
            await lockBranch(tx, found.branchId);
            const qty = quantity(b.quantityAdded);
            const updated = await tx.stockItem.update({ where: { id: found.id }, data: { currentStock: { increment: qty }, unitCost: b.unitCost === undefined ? undefined : amount(b.unitCost, 'Unit cost', true), supplierName: b.supplierName || found.supplierName }, include: { branch: true } });
            await record(tx, req, updated, qty, 'STOCK_RESTOCKED', { unitCost: updated.unitCost, supplierName: updated.supplierName, invoiceRef: b.invoiceRef || null, notes: b.notes || null });
            return updated;
        });
        res.json({ stockItem: item, message: 'Stock intake recorded' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.post('/audit', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await transaction(async (tx) => {
            const b = req.body;
            const found = await tx.stockItem.findUniqueOrThrow({ where: { id: b.stockItemId } });
            await lockBranch(tx, found.branchId);
            const item = await tx.stockItem.findUniqueOrThrow({ where: { id: found.id } });
            const counted = quantity(b.countedStock, true);
            if (!String(b.reason || '').trim())
                throw new Error('Audit reason is required');
            const updated = await tx.stockItem.update({ where: { id: item.id }, data: { currentStock: counted } });
            const audit = await tx.stockAudit.create({ data: { branchId: item.branchId, stockItemId: item.id, systemStock: item.currentStock, countedStock: counted, variance: counted - item.currentStock, reason: b.reason, auditedBy: req.user!.name, notes: b.notes || null }, include: { branch: true, stockItem: true } });
            await record(tx, req, updated, audit.variance, 'STOCK_AUDITED', { systemStock: item.currentStock, countedStock: counted, reason: b.reason, notes: b.notes || null });
            return { audit, newStock: counted };
        });
        res.json({ ...result, message: 'Stock reconciled' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.post('/transfer', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await transaction(async (tx) => {
            const b = req.body;
            const qty = quantity(b.quantity);
            if (!b.sourceBranchId || !b.destBranchId || b.sourceBranchId === b.destBranchId)
                throw new Error('Choose different source and destination branches');
            for (const id of [b.sourceBranchId, b.destBranchId].sort())
                await lockBranch(tx, id);
            const source = await tx.stockItem.findUniqueOrThrow({ where: { id: b.stockItemId } });
            if (source.branchId !== b.sourceBranchId)
                throw new Error('Stock does not belong to source branch');
            let dest = await tx.stockItem.findFirst({ where: { branchId: b.destBranchId, unit: source.unit, ...(source.sku ? { sku: source.sku } : { name: source.name }) } });
            if (!dest)
                dest = await tx.stockItem.create({ data: { branchId: b.destBranchId, name: source.name, sku: source.sku, type: source.type, unit: source.unit, currentStock: 0, minStockAlert: source.minStockAlert, unitCost: source.unitCost, supplierName: source.supplierName } });
            const changed = await tx.stockItem.updateMany({ where: { id: source.id, currentStock: { gte: qty } }, data: { currentStock: { decrement: qty } } });
            if (changed.count !== 1)
                throw new Error('Insufficient source stock');
            await tx.stockItem.update({ where: { id: dest.id }, data: { currentStock: { increment: qty } } });
            const transfer = await tx.stockTransfer.create({ data: { sourceBranchId: b.sourceBranchId, destBranchId: b.destBranchId, stockItemId: source.id, quantity: qty, status: 'RECEIVED', requestedBy: req.user!.name, notes: b.notes || null }, include: { sourceBranch: true, destBranch: true, stockItem: true } });
            await record(tx, req, source, -qty, 'STOCK_TRANSFER_OUT', { transferId: transfer.id, destinationBranchId: b.destBranchId });
            await record(tx, req, dest, qty, 'STOCK_TRANSFER_IN', { transferId: transfer.id, sourceBranchId: b.sourceBranchId });
            return { transfer };
        });
        res.json({ ...result, message: 'Immediate branch transfer recorded' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.get('/transfers', authenticateToken, async (req: AuthenticatedRequest, res: Response) => { try {
    const b = req.branchScopeId;
    res.json(await prisma.stockTransfer.findMany({ where: b ? { OR: [{ sourceBranchId: b }, { destBranchId: b }] } : {}, include: { sourceBranch: true, destBranch: true, stockItem: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
}
catch {
    res.status(500).json({ error: 'Could not load transfers' });
} });
router.get('/audits', authenticateToken, async (req: AuthenticatedRequest, res: Response) => { try {
    res.json(await prisma.stockAudit.findMany({ where: req.branchScopeId ? { branchId: req.branchScopeId } : {}, include: { branch: true, stockItem: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
}
catch {
    res.status(500).json({ error: 'Could not load audits' });
} });
router.put('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const item = await transaction(async (tx) => {
            const b = req.body;
            const found = await tx.stockItem.findUniqueOrThrow({ where: { id: String(req.params.id) } });
            await lockBranch(tx, found.branchId);
            const old = await tx.stockItem.findUniqueOrThrow({ where: { id: found.id } });
            if (b.branchId && b.branchId !== old.branchId)
                throw new Error('Use a stock transfer to move inventory between branches');
            if (b.unit && b.unit !== old.unit && await tx.stockMovement.count({ where: { stockItemId: old.id } }))
                throw new Error('Cannot change the unit of tracked stock');
            const item = await tx.stockItem.update({ where: { id: old.id }, data: { name: b.name, sku: b.sku, type: b.type, unit: b.unit, currentStock: b.currentStock === undefined ? undefined : quantity(b.currentStock, true), minStockAlert: b.minStockAlert === undefined ? undefined : quantity(b.minStockAlert, true), unitCost: b.unitCost === undefined ? undefined : amount(b.unitCost, 'Unit cost', true), supplierName: b.supplierName }, include: { branch: true } });
            await record(tx, req, item, item.currentStock - old.currentStock, 'STOCK_UPDATED', { previousStock: old.currentStock, currentStock: item.currentStock, unitCost: item.unitCost });
            return item;
        });
        res.json(item);
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
router.delete('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        await transaction(async (tx) => {
            const item = await tx.stockItem.findUniqueOrThrow({ where: { id: String(req.params.id) } });
            await lockBranch(tx, item.branchId);
            if (await tx.stockMovement.count({ where: { stockItemId: item.id } }) || await tx.stockAudit.count({ where: { stockItemId: item.id } }) || await tx.stockTransfer.count({ where: { stockItemId: item.id } }))
                throw new Error('Tracked stock cannot be deleted; its movement history must be retained');
            await logActivity(tx, req.user!, 'STOCK_DELETED', 'STOCK', item.id, item.branchId, null, { name: item.name });
            await tx.stockItem.delete({ where: { id: item.id } });
        });
        res.json({ message: 'Stock item deleted' });
    }
    catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
export default router;
