import prisma from '../prisma.js';

export async function getDashboardSummary(branchId?: string | null, dateStr?: string) {
  const whereBranch = branchId ? { branchId } : {};

  // Date filtering
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  // 1. Today's Orders
  const todayOrders = await prisma.order.findMany({
    where: {
      ...whereBranch,
      status: 'COMPLETED',
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
      payments: true,
    },
  });

  const todayGrossSales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayDiscounts = todayOrders.reduce((sum, o) => sum + o.discountAmount, 0);
  const todayOrderCount = todayOrders.length;
  const averageTicket = todayOrderCount > 0 ? todayGrossSales / todayOrderCount : 0;

  // COGS for today's completed orders
  let todayCOGS = 0;
  for (const order of todayOrders) {
    for (const item of order.items) {
      todayCOGS += (item.unitCost || 0) * item.quantity;
    }
  }

  // 2. Today's Expenses
  const todayExpenses = await prisma.expense.findMany({
    where: {
      ...whereBranch,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const totalTodayExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayNetProfit = todayGrossSales - todayCOGS - totalTodayExpenses;

  // 3. Payment methods breakdown for today
  let cashSales = 0;
  let mpesaSales = 0;
  let cardSales = 0;

  todayOrders.forEach(order => {
    order.payments.forEach(p => {
      if (p.paymentMethod === 'CASH') cashSales += p.amount;
      else if (p.paymentMethod === 'MPESA') mpesaSales += p.amount;
      else if (p.paymentMethod === 'CARD') cardSales += p.amount;
      else if (p.paymentMethod === 'SPLIT') {
        // approximate cash vs mpesa
        if (p.mpesaCode) mpesaSales += p.amount;
        else cashSales += p.amount;
      }
    });
  });

  // 4. Low stock count
  const lowStockCount = await prisma.stockItem.count({
    where: {
      ...whereBranch,
      currentStock: {
        lte: prisma.stockItem.fields.minStockAlert,
      },
    },
  });

  return {
    todayGrossSales,
    todayDiscounts,
    todayOrderCount,
    averageTicket: Math.round(averageTicket),
    todayCOGS,
    totalTodayExpenses,
    todayNetProfit,
    cashSales,
    mpesaSales,
    cardSales,
    lowStockCount,
    date: startOfDay.toISOString(),
  };
}

export async function getSalesByCategory(branchId?: string | null, days = 7) {
  const whereBranch = branchId ? { branchId } : {};
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        ...whereBranch,
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
    },
    include: {
      menuItem: {
        include: {
          category: true,
        },
      },
    },
  });

  const categoryMap: Record<string, { name: string; revenue: number; quantity: number }> = {};

  orderItems.forEach(item => {
    const catName = item.menuItem?.category?.name || 'Uncategorized';
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, revenue: 0, quantity: 0 };
    }
    categoryMap[catName].revenue += item.totalPrice;
    categoryMap[catName].quantity += item.quantity;
  });

  return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
}

export async function getTopSellingItems(branchId?: string | null, limit = 20, days = 30) {
  const whereBranch = branchId ? { branchId } : {};
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        ...whereBranch,
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
    },
  });

  const itemMap: Record<string, { name: string; variant?: string; quantity: number; revenue: number; cost: number; profit: number }> = {};

  orderItems.forEach(item => {
    const key = `${item.itemName}___${item.variantName || ''}`;
    if (!itemMap[key]) {
      itemMap[key] = {
        name: item.itemName,
        variant: item.variantName || undefined,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    const unitCost = item.unitCost || 0;
    const itemCost = Math.round(unitCost * item.quantity);
    const itemProfit = Math.round(item.totalPrice - itemCost);

    itemMap[key].quantity += item.quantity;
    itemMap[key].revenue += item.totalPrice;
    itemMap[key].cost += itemCost;
    itemMap[key].profit += itemProfit;
  });

  return Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getHourlySalesDistribution(branchId?: string | null) {
  const whereBranch = branchId ? { branchId } : {};
  const since = new Date();
  since.setDate(since.getDate() - 7); // Last 7 days distribution

  const orders = await prisma.order.findMany({
    where: {
      ...whereBranch,
      status: 'COMPLETED',
      createdAt: { gte: since },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  // Hours from 08:00 to 23:00
  const hoursMap: Record<number, { hour: string; sales: number; orderCount: number }> = {};
  for (let h = 8; h <= 23; h++) {
    hoursMap[h] = {
      hour: `${h.toString().padStart(2, '0')}:00`,
      sales: 0,
      orderCount: 0,
    };
  }

  orders.forEach(order => {
    const h = new Date(order.createdAt).getHours();
    if (hoursMap[h]) {
      hoursMap[h].sales += order.totalAmount;
      hoursMap[h].orderCount += 1;
    }
  });

  return Object.values(hoursMap);
}

export async function getBranchComparison() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      orders: {
        where: { status: 'COMPLETED' },
        include: { items: true },
      },
      expenses: true,
    },
  });

  return branches.map(branch => {
    const totalSales = branch.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = branch.orders.length;
    const totalExpenses = branch.expenses.reduce((sum, e) => sum + e.amount, 0);
    
    let totalCOGS = 0;
    branch.orders.forEach(o => {
      o.items.forEach(i => {
        totalCOGS += (i.unitCost || 0) * i.quantity;
      });
    });

    const netProfit = totalSales - totalCOGS - totalExpenses;

    return {
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      totalSales,
      totalOrders,
      totalExpenses,
      totalCOGS,
      netProfit,
    };
  });
}

export async function getCashierPerformance(branchId?: string | null, days = 7) {
  const whereBranch = branchId ? { branchId } : {};
  const since = new Date();
  since.setDate(since.getDate() - days);

  const cashiers = await prisma.user.findMany({
    where: {
      role: { in: ['CASHIER', 'MANAGER'] },
      isActive: true,
      ...(branchId ? { branchId } : {}),
    },
    include: {
      orders: {
        where: {
          ...whereBranch,
          status: 'COMPLETED',
          createdAt: { gte: since },
        },
      },
      branch: true,
    },
  });

  return cashiers.map(c => {
    const totalSales = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = c.orders.length;
    const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      cashierId: c.id,
      name: c.name,
      role: c.role,
      branchName: c.branch?.name || 'Central',
      orderCount,
      totalSales,
      avgTicket: Math.round(avgTicket),
    };
  }).sort((a, b) => b.totalSales - a.totalSales);
}

export async function getProfitLoss(branchId?: string | null, startDate?: string, endDate?: string) {
  const dateFilter: any = {};
  if (startDate && endDate) {
    dateFilter.gte = new Date(startDate);
    dateFilter.lte = new Date(endDate);
  } else {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter.gte = thirtyDaysAgo;
  }

  const whereOrders: any = {
    status: 'COMPLETED',
    createdAt: dateFilter,
  };
  if (branchId) whereOrders.branchId = branchId;

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
  if (branchId) whereExpenses.branchId = branchId;

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

  return {
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
  };
}
