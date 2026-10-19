import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create / Checkout Order (with Stock Auto-Deduction and Payment Recording)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      branchId,
      orderType,
      tableNumber,
      customerName,
      customerPhone,
      items,
      discountAmount,
      discountReason,
      notes,
      payments,
      isHeld,
      isOfflineSynced,
    } = req.body;

    const targetBranchId = branchId || req.user?.branchId;
    if (!targetBranchId) {
      res.status(400).json({ error: 'Branch is required' });
      return;
    }

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required in the order' });
      return;
    }

    // Keep the sale, payments, stock deductions, and shift totals atomic.
    const result = await prisma.$transaction(async (tx) => {
      // Check for open shift for cashier/branch
      const activeShift = await tx.shift.findFirst({
        where: {
          branchId: targetBranchId,
          status: 'OPEN',
        },
        orderBy: { openedAt: 'desc' },
      });

      // Calculate totals
      let subtotal = 0;
      const orderItemsData = items.map((item: any) => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        return {
          menuItemId: item.menuItemId,
          variantId: item.variantId || null,
          itemName: item.itemName,
          variantName: item.variantName || null,
          quantity: parseInt(item.quantity, 10),
          unitPrice: parseFloat(item.unitPrice),
          unitCost: item.unitCost ? parseFloat(item.unitCost) : 0,
          totalPrice: lineTotal,
          notes: item.notes || null,
        };
      });

      const discount = discountAmount ? parseFloat(discountAmount) : 0;
      const totalAmount = Math.max(0, subtotal - discount);
      const orderStatus = isHeld ? 'HELD' : 'COMPLETED';

      // Use a long random suffix so busy days do not exhaust a 4-digit namespace.
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
      const orderNumber = `ORD-${datePart}-${randPart}`;

      // Create Order with Items in a transaction
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          branchId: targetBranchId,
          cashierId: req.user!.id,
          shiftId: activeShift?.id || null,
          orderType: orderType || 'DINE_IN',
          tableNumber: tableNumber || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          status: orderStatus,
          subtotal,
          discountAmount: discount,
          discountReason: discountReason || null,
          totalAmount,
          notes: notes || null,
          isOfflineSynced: Boolean(isOfflineSynced),
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
          branch: true,
          cashier: { select: { id: true, name: true } },
        },
      });

      // If order is completed, process payments and deduct inventory stock
      let stockWarnings: string[] = [];
      if (orderStatus === 'COMPLETED') {
        // 1. Record Payments
        if (payments && payments.length > 0) {
          for (const p of payments) {
            await tx.payment.create({
              data: {
                orderId: newOrder.id,
                branchId: targetBranchId,
                amount: parseFloat(p.amount),
                paymentMethod: p.paymentMethod || 'CASH',
                mpesaCode: p.mpesaCode ? p.mpesaCode.toUpperCase().trim() : null,
                cardRef: p.cardRef || null,
                cashTendered: p.cashTendered ? parseFloat(p.cashTendered) : null,
                changeAmount: p.changeAmount ? parseFloat(p.changeAmount) : null,
                status: 'COMPLETED',
              },
            });
          }
        } else {
          // Default to cash payment if not explicitly given
          await tx.payment.create({
            data: {
              orderId: newOrder.id,
              branchId: targetBranchId,
              amount: totalAmount,
              paymentMethod: 'CASH',
              status: 'COMPLETED',
            },
          });
        }

        // 2. Automatically Deduct Recipe & Packaged Stock Items
        const stockResult = await deductStockForOrder(targetBranchId, items, tx);
        stockWarnings = stockResult.warnings;

        // 3. Update Shift Totals if open shift
        if (activeShift) {
          let cashInc = 0;
          let mpesaInc = 0;
          let cardInc = 0;

          (payments || [{ paymentMethod: 'CASH', amount: totalAmount }]).forEach((p: any) => {
            const amt = parseFloat(p.amount);
            if (p.paymentMethod === 'CASH') cashInc += amt;
            else if (p.paymentMethod === 'MPESA') mpesaInc += amt;
            else if (p.paymentMethod === 'CARD') cardInc += amt;
            else if (p.paymentMethod === 'SPLIT') {
              if (p.mpesaCode) mpesaInc += amt;
              else cashInc += amt;
            }
          });

          await tx.shift.update({
            where: { id: activeShift.id },
            data: {
              totalCashSales: { increment: cashInc },
              totalMpesaSales: { increment: mpesaInc },
              totalCardSales: { increment: cardInc },
            },
          });
        }
      }

      const completedOrder = await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: true,
          payments: true,
          branch: true,
          cashier: { select: { id: true, name: true } },
        },
      });

      return {
        order: completedOrder,
        warnings: stockWarnings,
        message: isHeld ? 'Order parked/held successfully' : 'Order completed and stock updated',
      };
    }, { maxWait: 2000, timeout: 8000 });
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume / Complete a Held Order
router.patch('/:id/resume', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { payments } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, branch: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'HELD') {
      res.status(400).json({ error: `Order is already ${order.status}` });
      return;
    }

    // Process payments
    if (payments && payments.length > 0) {
      for (const p of payments) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            branchId: order.branchId,
            amount: parseFloat(p.amount),
            paymentMethod: p.paymentMethod || 'CASH',
            mpesaCode: p.mpesaCode ? p.mpesaCode.toUpperCase().trim() : null,
            cardRef: p.cardRef || null,
            cashTendered: p.cashTendered ? parseFloat(p.cashTendered) : null,
            changeAmount: p.changeAmount ? parseFloat(p.changeAmount) : null,
          },
        });
      }
    } else {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          branchId: order.branchId,
          amount: order.totalAmount,
          paymentMethod: 'CASH',
        },
      });
    }

    // Deduct stock
    const stockResult = await deductStockForOrder(order.branchId, order.items);

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: { items: true, payments: true, branch: true, cashier: true },
    });

    res.json({
      order: updatedOrder,
      warnings: stockResult.warnings,
      message: 'Held order resumed and completed',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Order & Restore Stock
router.delete('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'COMPLETED') {
      // Restore inventory stock
      await restoreStockForOrder(order.branchId, order.items);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    });

    res.json({
      message: 'Order cancelled and stock restored',
      order: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
