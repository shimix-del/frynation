import { Prisma } from '@prisma/client';
import { AuthUser } from '../middleware/auth.js';
import { logActivity } from './activityService.js';
type SaleItem = {
    menuItemId: string;
    variantId?: string | null;
    quantity: number;
    itemName: string;
};
export async function deductStockForOrder(tx: Prisma.TransactionClient, branchId: string, items: SaleItem[], orderId: string, shiftId: string, user: AuthUser) {
    const needed = new Map<string, {
        stock: any;
        quantity: number;
    }>();
    const warnings: string[] = [];
    for (const item of items) {
        const mappings = await tx.menuItemRecipe.findMany({ where: { menuItemId: item.menuItemId,
                OR: [{ variantId: null }, ...(item.variantId ? [{ variantId: item.variantId }] : [])] },
            include: { stockItem: true }, orderBy: { id: 'asc' } });
        // Prefer branch-specific recipes; otherwise use one template branch, never every branch's copy.
        const local = mappings.filter(r => r.stockItem.branchId === branchId);
        const source = local.length ? local : mappings.filter(r => r.stockItem.branchId === mappings[0]?.stockItem.branchId);
        const specific = source.filter(r => item.variantId && r.variantId === item.variantId);
        const recipes = specific.length ? specific : source.filter(r => !r.variantId);
        for (const recipe of recipes) {
            const template = recipe.stockItem;
            const stock = template.branchId === branchId ? template : await tx.stockItem.findFirst({ where: {
                    branchId, unit: template.unit, ...(template.sku ? { sku: template.sku } : { name: template.name })
                } });
            if (!stock)
                throw new Error('Missing branch stock mapping for ' + template.name);
            const quantity = recipe.quantityRequired * item.quantity;
            if (!Number.isFinite(quantity) || quantity <= 0)
                throw new Error('Invalid recipe quantity for ' + item.itemName);
            const existing = needed.get(stock.id);
            needed.set(stock.id, { stock, quantity: quantity + (existing?.quantity || 0) });
        }
        if (!recipes.length) {
            const stock = await tx.stockItem.findFirst({ where: { branchId, type: 'PACKAGED_UNIT', name: item.itemName } });
            if (stock) {
                const existing = needed.get(stock.id);
                needed.set(stock.id, { stock, quantity: item.quantity + (existing?.quantity || 0) });
            }
            else
                warnings.push('No inventory mapping for ' + item.itemName + '; stock was not deducted for this item.');
        }
    }
    for (const [id, { stock, quantity }] of [...needed.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const result = await tx.stockItem.updateMany({ where: { id, branchId, currentStock: { gte: quantity } }, data: { currentStock: { decrement: quantity } } });
        if (result.count !== 1)
            throw new Error('Insufficient stock: ' + stock.name);
        await tx.stockMovement.create({ data: { stockItemId: id, stockItemName: stock.name, branchId, orderId, shiftId, actorId: user.id, quantity: -quantity, reason: 'SALE' } });
        await logActivity(tx, user, 'STOCK_DEDUCTED', 'STOCK', id, branchId, shiftId, { orderId, name: stock.name, quantity: -quantity, unit: stock.unit });
        if (stock.currentStock - quantity <= stock.minStockAlert)
            warnings.push('Low stock: ' + stock.name);
    }
    return { warnings };
}
export async function restoreStockForOrder(tx: Prisma.TransactionClient, orderId: string, branchId: string, shiftId: string | null, user: AuthUser) {
    const movements = await tx.stockMovement.findMany({ where: { orderId, reason: 'SALE' }, orderBy: { stockItemId: 'asc' } });
    for (const movement of movements) {
        if (await tx.stockMovement.findUnique({ where: { reversesMovementId: movement.id } }))
            continue;
        await tx.stockItem.update({ where: { id: movement.stockItemId }, data: { currentStock: { increment: -movement.quantity } } });
        await tx.stockMovement.create({ data: { id: 'reverse_' + movement.id, stockItemId: movement.stockItemId, stockItemName: movement.stockItemName, branchId, orderId, shiftId, actorId: user.id, quantity: -movement.quantity, reason: 'CANCELLATION', reversesMovementId: movement.id } });
        await logActivity(tx, user, 'STOCK_RESTORED', 'STOCK', movement.stockItemId, branchId, shiftId, { orderId, quantity: -movement.quantity });
    }
}
