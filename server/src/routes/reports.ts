import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, requireManagerOrOwner } from '../middleware/auth.js';
import {
  getDashboardSummary,
  getSalesByCategory,
  getTopSellingItems,
  getHourlySalesDistribution,
  getBranchComparison,
  getCashierPerformance,
} from '../services/reportService.js';
import prisma from '../prisma.js';
import { unlockAnalytics, requireAnalyticsUnlock } from '../middleware/analyticsAccess.js';

const router = Router();
router.use(authenticateToken);
router.post('/unlock', unlockAnalytics);
router.use(requireAnalyticsUnlock);

// Overview Dashboard Summary
router.get('/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, date } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? null : req.user?.branchId || null);

    const summary = await getDashboardSummary(targetBranchId, date as string);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sales By Category
router.get('/sales-by-category', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, days } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? null : req.user?.branchId || null);

    const categories = await getSalesByCategory(targetBranchId, days ? parseInt(days as string, 10) : 7);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Top Selling Menu Items
router.get('/top-items', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, limit, days } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? null : req.user?.branchId || null);

    const topItems = await getTopSellingItems(
      targetBranchId,
      limit ? parseInt(limit as string, 10) : 10,
      days ? parseInt(days as string, 10) : 7
    );
    res.json(topItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Hourly Peak Analysis
router.get('/hourly', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? null : req.user?.branchId || null);

    const hourly = await getHourlySalesDistribution(targetBranchId);
    res.json(hourly);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Multi-Branch Comparison (Owner Only)
router.get('/branch-comparison', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const comparison = await getBranchComparison();
    res.json(comparison);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cashier Performance League
router.get('/cashier-performance', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, days } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? null : req.user?.branchId || null);

    const cashiers = await getCashierPerformance(targetBranchId, days ? parseInt(days as string, 10) : 7);
    res.json(cashiers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detailed Profit & Loss Statement
router.get('/profit-loss', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const targetBranchId = req.user?.role === 'OWNER' && branchId && branchId !== 'all'
      ? (branchId as string)
      : (req.user?.role === 'OWNER' && (!branchId || branchId === 'all') ? undefined : req.user?.branchId || undefined);

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate as string);
      dateFilter.lte = new Date(endDate as string);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.gte = thirtyDaysAgo;
    }

    const whereOrders: any = {
      status: 'COMPLETED',
      createdAt: dateFilter,
    };
    if (targetBranchId) whereOrders.branchId = targetBranchId;

    const orders = await prisma.order.findMany({
      where: whereOrders,
      include: { items: true },
    });

    const grossSales = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + o.discountAmount, 0);
    const netSales = grossSales - totalDiscounts;

    let cogs = 0;
    orders.forEach(o => {
      o.items.forEach(i => {
        cogs += (i.unitCost || 0) * i.quantity;
      });
    });

    const grossProfit = netSales - cogs;
    const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    const whereExpenses: any = { createdAt: dateFilter };
    if (targetBranchId) whereExpenses.branchId = targetBranchId;

    const expenses = await prisma.expense.findMany({
      where: whereExpenses,
    });

    const expensesByCategory: Record<string, number> = {};
    let totalExpenses = 0;

    expenses.forEach(e => {
      totalExpenses += e.amount;
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    const netOperatingProfit = grossProfit - totalExpenses;
    const netMargin = netSales > 0 ? (netOperatingProfit / netSales) * 100 : 0;

    res.json({
      period: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte || new Date(),
      },
      grossSales,
      totalDiscounts,
      netSales,
      cogs,
      grossProfit,
      grossMargin: parseFloat(grossMargin.toFixed(1)),
      totalExpenses,
      expensesByCategory,
      netOperatingProfit,
      netMargin: parseFloat(netMargin.toFixed(1)),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
