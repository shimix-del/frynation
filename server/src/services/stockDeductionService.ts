import prisma from '../prisma.js';
import type { Prisma } from '@prisma/client';

export interface StockDeductionResult {
  success: boolean;
  deductedItems: Array<{
    stockItemId: string;
    stockItemName: string;
    quantityDeducted: number;
    remainingStock: number;
    unit: string;
    isLowStock: boolean;
  }>;
  warnings: string[];
}

/**
 * Automatically deducts stock for an order based on direct unit items and recipe BOM
 */
export async function deductStockForOrder(
  branchId: string,
  items: Array<{
    menuItemId: string;
    variantId?: string | null;
    quantity: number;
    itemName: string;
  }>,
  db: Prisma.TransactionClient = prisma
): Promise<StockDeductionResult> {
  const deductedItems: StockDeductionResult['deductedItems'] = [];
  const warnings: string[] = [];

  for (const item of items) {
    // 1. Check for recipe entries for this menu item or specific variant
    const recipes = await db.menuItemRecipe.findMany({
      where: {
        menuItemId: item.menuItemId,
        OR: [
          { variantId: item.variantId || undefined },
          { variantId: null },
        ],
      },
      include: {
        stockItem: true,
      },
    });

    if (recipes.length > 0) {
      for (const recipe of recipes) {
        // Look up branch-specific stock item if recipe stockItem was a template or match by name
        let targetStockItem = recipe.stockItem;
        if (targetStockItem.branchId !== branchId) {
          const branchItem = await db.stockItem.findFirst({
            where: {
              branchId: branchId,
              name: targetStockItem.name,
            },
          });
          if (branchItem) {
            targetStockItem = branchItem;
          }
        }

        const deductQty = recipe.quantityRequired * item.quantity;
        await db.$executeRaw`UPDATE StockItem SET currentStock = GREATEST(0, currentStock - ${deductQty}), updatedAt = NOW(3) WHERE id = ${targetStockItem.id}`;
        const updated = await db.stockItem.findUniqueOrThrow({ where: { id: targetStockItem.id } });

        deductedItems.push({
          stockItemId: updated.id,
          stockItemName: updated.name,
          quantityDeducted: deductQty,
          remainingStock: updated.currentStock,
          unit: updated.unit,
          isLowStock: updated.currentStock <= updated.minStockAlert,
        });

        if (updated.currentStock <= updated.minStockAlert) {
          warnings.push(`Low stock warning: ${updated.name} has only ${updated.currentStock} ${updated.unit} left at branch!`);
        }
      }
    } else {
      // 2. Direct unit item matching (e.g. packaged drinks like "Coca-Cola 300ml", "Dasani 500ml")
      const directStockItem = await db.stockItem.findFirst({
        where: {
          branchId: branchId,
          name: {
            contains: item.itemName,
          },
        },
      });

      if (directStockItem) {
        const deductQty = item.quantity;
        await db.$executeRaw`UPDATE StockItem SET currentStock = GREATEST(0, currentStock - ${deductQty}), updatedAt = NOW(3) WHERE id = ${directStockItem.id}`;
        const updated = await db.stockItem.findUniqueOrThrow({ where: { id: directStockItem.id } });

        deductedItems.push({
          stockItemId: updated.id,
          stockItemName: updated.name,
          quantityDeducted: deductQty,
          remainingStock: updated.currentStock,
          unit: updated.unit,
          isLowStock: updated.currentStock <= updated.minStockAlert,
        });

        if (updated.currentStock <= updated.minStockAlert) {
          warnings.push(`Low stock alert: ${updated.name} has only ${updated.currentStock} ${updated.unit} left!`);
        }
      }
    }
  }

  return {
    success: true,
    deductedItems,
    warnings,
  };
}

/**
 * Restores stock if an order is cancelled
 */
export async function restoreStockForOrder(
  branchId: string,
  items: Array<{
    menuItemId: string;
    variantId?: string | null;
    quantity: number;
    itemName: string;
  }>
): Promise<void> {
  for (const item of items) {
    const recipes = await prisma.menuItemRecipe.findMany({
      where: {
        menuItemId: item.menuItemId,
        OR: [
          { variantId: item.variantId || undefined },
          { variantId: null },
        ],
      },
      include: {
        stockItem: true,
      },
    });

    if (recipes.length > 0) {
      for (const recipe of recipes) {
        let targetStockItem = recipe.stockItem;
        if (targetStockItem.branchId !== branchId) {
          const branchItem = await prisma.stockItem.findFirst({
            where: {
              branchId: branchId,
              name: targetStockItem.name,
            },
          });
          if (branchItem) targetStockItem = branchItem;
        }

        const restoreQty = recipe.quantityRequired * item.quantity;
        await prisma.stockItem.update({
          where: { id: targetStockItem.id },
          data: { currentStock: { increment: restoreQty } },
        });
      }
    } else {
      const directStockItem = await prisma.stockItem.findFirst({
        where: {
          branchId: branchId,
          name: { contains: item.itemName },
        },
      });

      if (directStockItem) {
        await prisma.stockItem.update({
          where: { id: directStockItem.id },
          data: { currentStock: { increment: item.quantity } },
        });
      }
    }
  }
}
