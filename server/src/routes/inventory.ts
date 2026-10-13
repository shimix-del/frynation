import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireManagerOrOwner } from '../middleware/auth.js';

const router = Router();

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new stock item
router.post('/', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      branchId,
      name,
      sku,
      type,
      unit,
      currentStock,
      minStockAlert,
      unitCost,
      supplierName,
    } = req.body;

    const targetBranchId = branchId || req.user?.branchId;
    if (!targetBranchId || !name || !unit) {
      res.status(400).json({ error: 'Branch, name, and measurement unit are required' });
      return;
    }

    const item = await prisma.stockItem.create({
      data: {
        branchId: targetBranchId,
        name,
        sku: sku || null,
        type: type || 'RAW_INGREDIENT',
        unit,
        currentStock: currentStock !== undefined ? parseFloat(currentStock) : 0,
        minStockAlert: minStockAlert !== undefined ? parseFloat(minStockAlert) : 5,
        unitCost: unitCost !== undefined ? parseFloat(unitCost) : 0,
        supplierName: supplierName || null,
      },
      include: { branch: true },
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restock Intake
router.post('/restock', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { stockItemId, quantityAdded, unitCost, supplierName, invoiceRef, notes } = req.body;

    if (!stockItemId || !quantityAdded || parseFloat(quantityAdded) <= 0) {
      res.status(400).json({ error: 'Stock item and positive quantity are required' });
      return;
    }

    const stockItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!stockItem) {
      res.status(404).json({ error: 'Stock item not found' });
      return;
    }

    const qty = parseFloat(quantityAdded);
    const newStock = stockItem.currentStock + qty;
    const cost = unitCost !== undefined ? parseFloat(unitCost) : stockItem.unitCost;

    const updated = await prisma.stockItem.update({
      where: { id: stockItemId },
      data: {
        currentStock: newStock,
        unitCost: cost,
        supplierName: supplierName || stockItem.supplierName,
      },
      include: { branch: true },
    });

    res.json({
      message: `Successfully restocked ${qty} ${updated.unit} of ${updated.name}`,
      stockItem: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Inter-Branch Stock Transfer
router.post('/transfer', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sourceBranchId, destBranchId, stockItemId, quantity, notes } = req.body;

    if (!sourceBranchId || !destBranchId || !stockItemId || !quantity) {
      res.status(400).json({ error: 'Source branch, destination branch, stock item, and quantity are required' });
      return;
    }

    if (sourceBranchId === destBranchId) {
      res.status(400).json({ error: 'Source and destination branches must be different' });
      return;
    }

    const qty = parseFloat(quantity);
    const sourceItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!sourceItem || sourceItem.branchId !== sourceBranchId) {
      res.status(404).json({ error: 'Stock item not found at source branch' });
      return;
    }

    if (sourceItem.currentStock < qty) {
      res.status(400).json({
        error: `Insufficient stock at source branch. Available: ${sourceItem.currentStock} ${sourceItem.unit}`,
      });
      return;
    }

    // Find or create matching stock item at destination branch
    let destItem = await prisma.stockItem.findFirst({
      where: {
        branchId: destBranchId,
        name: sourceItem.name,
      },
    });

    if (!destItem) {
      destItem = await prisma.stockItem.create({
        data: {
          branchId: destBranchId,
          name: sourceItem.name,
          sku: sourceItem.sku,
          type: sourceItem.type,
          unit: sourceItem.unit,
          currentStock: 0,
          minStockAlert: sourceItem.minStockAlert,
          unitCost: sourceItem.unitCost,
          supplierName: sourceItem.supplierName,
        },
      });
    }

    // Execute transfer in a Prisma transaction
    const [updatedSource, updatedDest, transferRecord] = await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: sourceItem.id },
        data: { currentStock: { decrement: qty } },
      }),
      prisma.stockItem.update({
        where: { id: destItem.id },
        data: { currentStock: { increment: qty } },
      }),
      prisma.stockTransfer.create({
        data: {
          sourceBranchId,
          destBranchId,
          stockItemId: sourceItem.id,
          quantity: qty,
          status: 'RECEIVED',
          requestedBy: req.user?.name,
          notes: notes || null,
        },
        include: {
          sourceBranch: true,
          destBranch: true,
          stockItem: true,
        },
      }),
    ]);

    res.json({
      message: `Transferred ${qty} ${sourceItem.unit} of ${sourceItem.name} successfully`,
      transfer: transferRecord,
      sourceStock: updatedSource.currentStock,
      destStock: updatedDest.currentStock,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stock Reconciliation / Audit
router.post('/audit', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { stockItemId, countedStock, reason, notes } = req.body;

    if (!stockItemId || countedStock === undefined) {
      res.status(400).json({ error: 'Stock item and counted physical stock are required' });
      return;
    }

    const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) {
      res.status(404).json({ error: 'Stock item not found' });
      return;
    }

    const physicalCount = parseFloat(countedStock);
    const systemStock = item.currentStock;
    const variance = physicalCount - systemStock; // Negative means shrinkage/theft/spoilage

    const [updatedItem, auditRecord] = await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: stockItemId },
        data: { currentStock: physicalCount },
      }),
      prisma.stockAudit.create({
        data: {
          branchId: item.branchId,
          stockItemId: item.id,
          systemStock,
          countedStock: physicalCount,
          variance,
          reason: reason || 'RECONCILIATION',
          auditedBy: req.user?.name,
          notes: notes || null,
        },
        include: {
          branch: true,
          stockItem: true,
        },
      }),
    ]);

    res.json({
      message: 'Stock audit recorded and inventory reconciled',
      audit: auditRecord,
      newStock: updatedItem.currentStock,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List stock transfers
router.get('/transfers', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const where: any = {};

    if (branchId && branchId !== 'all') {
      where.OR = [
        { sourceBranchId: branchId as string },
        { destBranchId: branchId as string },
      ];
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        sourceBranch: true,
        destBranch: true,
        stockItem: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List stock audits
router.get('/audits', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const where: any = branchId && branchId !== 'all' ? { branchId: branchId as string } : {};

    const audits = await prisma.stockAudit.findMany({
      where,
      include: {
        branch: true,
        stockItem: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock item
router.put('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      name,
      sku,
      type,
      unit,
      currentStock,
      minStockAlert,
      unitCost,
      supplierName,
      branchId,
    } = req.body;

    const item = await prisma.stockItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Stock item not found' });
      return;
    }

    const updated = await prisma.stockItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        sku: sku !== undefined ? sku : undefined,
        type: type !== undefined ? type : undefined,
        unit: unit !== undefined ? unit : undefined,
        currentStock: currentStock !== undefined ? parseFloat(currentStock) : undefined,
        minStockAlert: minStockAlert !== undefined ? parseFloat(minStockAlert) : undefined,
        unitCost: unitCost !== undefined ? parseFloat(unitCost) : undefined,
        supplierName: supplierName !== undefined ? supplierName : undefined,
        branchId: branchId !== undefined ? branchId : undefined,
      },
      include: { branch: true },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete stock item
router.delete('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const item = await prisma.stockItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Stock item not found' });
      return;
    }

    // Clean up associated recipes, transfers, and audits before deleting
    await prisma.menuItemRecipe.deleteMany({ where: { stockItemId: id } });
    await prisma.stockTransfer.deleteMany({ where: { stockItemId: id } });
    await prisma.stockAudit.deleteMany({ where: { stockItemId: id } });

    await prisma.stockItem.delete({ where: { id } });
    res.json({ message: `Stock item "${item.name}" deleted successfully`, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
