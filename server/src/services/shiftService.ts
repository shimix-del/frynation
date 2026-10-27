import { money } from '../security.js';
export function summarizeShift(shift: any) {
    const orders = (shift.orders || []).filter((o: any) => o.status === 'COMPLETED');
    const totals = { CASH: 0, MPESA: 0, CARD: 0 };
    const items = new Map<string, any>();
    for (const order of orders) {
        for (const p of order.payments || [])
            if (p.status === 'COMPLETED' && p.paymentMethod in totals)
                totals[p.paymentMethod as keyof typeof totals] += p.amount;
        for (const item of order.items || []) {
            const key = item.menuItemId + ':' + (item.variantId || '');
            const current = items.get(key) || { itemName: item.itemName, variantName: item.variantName, quantity: 0, totalPrice: 0 };
            current.quantity += item.quantity;
            current.totalPrice = money(current.totalPrice + item.totalPrice);
            items.set(key, current);
        }
    }
    const cashAdditions = money((shift.cashMovements || []).filter((m: any) => m.type === 'FLOAT_IN').reduce((n: number, m: any) => n + m.amount, 0));
    const cashDrops = money((shift.cashMovements || []).filter((m: any) => ['CASH_DROP', 'PAYOUT'].includes(m.type)).reduce((n: number, m: any) => n + m.amount, 0));
    return { ...shift, orders, totalCashSales: money(totals.CASH), totalMpesaSales: money(totals.MPESA), totalCardSales: money(totals.CARD),
        cashAdditions, cashDrops, expectedCash: money(shift.openingFloat + totals.CASH + cashAdditions - cashDrops), itemsSold: [...items.values()] };
}
export const shiftInclude = { branch: true, cashier: { select: { id: true, name: true, role: true } },
    cashMovements: true, expenses: true, orders: { include: { items: true, payments: true } } };
