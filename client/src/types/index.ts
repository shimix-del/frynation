export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  pinCode: string;
  branchId?: string | null;
  branchName?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  tillNumber?: string | null;
  paybillNumber?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: {
    users?: number;
    stockItems?: number;
    orders?: number;
  };
}

export interface Category {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  icon?: string | null;
  _count?: {
    menuItems?: number;
  };
}

export interface MenuItemVariant {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  costPrice: number;
  isAvailable: boolean;
}

export interface MenuItemRecipe {
  id: string;
  menuItemId: string;
  variantId?: string | null;
  stockItemId: string;
  quantityRequired: number;
  menuItem?: { id: string; name: string };
  variant?: { id: string; name: string };
  stockItem?: { id: string; name: string; unit: string; currentStock: number; unitCost: number };
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  basePrice: number;
  costPrice: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  hasVariants: boolean;
  category?: Category;
  variants?: MenuItemVariant[];
  recipes?: MenuItemRecipe[];
}

export interface StockItem {
  id: string;
  branchId: string;
  name: string;
  sku?: string | null;
  type: 'PACKAGED_UNIT' | 'RAW_INGREDIENT';
  unit: string;
  currentStock: number;
  minStockAlert: number;
  unitCost: number;
  supplierName?: string | null;
  isLowStock?: boolean;
  stockValue?: number;
  branch?: { id: string; name: string; code: string };
}

export interface OrderItem {
  id?: string;
  menuItemId: string;
  variantId?: string | null;
  itemName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  notes?: string | null;
}

export interface Payment {
  id?: string;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'SPLIT';
  mpesaCode?: string | null;
  cardRef?: string | null;
  cashTendered?: number | null;
  changeAmount?: number | null;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  cashierId: string;
  shiftId?: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  status: 'COMPLETED' | 'HELD' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  discountReason?: string | null;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  isOfflineSynced?: boolean;
  createdAt: string;
  branch?: Branch;
  cashier?: { id: string; name: string };
  items: OrderItem[];
  payments: Payment[];
}

export interface CashMovement {
  expenseId?: string | null;
  id: string;
  shiftId: string;
  branchId: string;
  type: 'FLOAT_IN' | 'CASH_DROP' | 'PAYOUT';
  amount: number;
  reason: string;
  authorizedBy?: string | null;
  createdAt: string;
}

export interface Shift {
  id: string;
  branchId: string;
  cashierId: string;
  openingFloat: number;
  closingCashActual?: number | null;
  closingCashExpected?: number | null;
  variance?: number | null;
  totalCashSales: number;
  totalMpesaSales: number;
  totalCardSales: number;
  totalExpensesPaid: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
  branch?: Branch;
  cashier?: { id: string; name: string; role: string };
  cashMovements?: CashMovement[];
  cashDrops?: number;
  cashAdditions?: number;
  expectedCash?: number;
  orders?: Order[];
  itemsSold?: { itemName: string; variantName?: string | null; quantity: number; totalPrice: number }[];
  _count?: { orders?: number };
}

export interface Expense {
  id: string;
  branchId: string;
  shiftId?: string | null;
  category: 'MARKET_PRODUCE' | 'GAS_CHARCOAL' | 'COOKING_OIL' | 'DAILY_WAGES' | 'UTILITIES' | 'REPAIRS' | 'TRANSPORT_BODA' | 'OTHER';
  amount: number;
  description: string;
  paidTo?: string | null;
  paymentSource: 'CASH_DRAWER' | 'BANK_MPESA';
  receiptNumber?: string | null;
  createdAt: string;
  branch?: { id: string; name: string; code: string };
}

export interface StockTransfer {
  id: string;
  sourceBranchId: string;
  destBranchId: string;
  stockItemId: string;
  quantity: number;
  status: 'PENDING' | 'DISPATCHED' | 'RECEIVED';
  requestedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  sourceBranch?: Branch;
  destBranch?: Branch;
  stockItem?: StockItem;
}

export interface StockAudit {
  id: string;
  branchId: string;
  stockItemId: string;
  systemStock: number;
  countedStock: number;
  variance: number;
  reason: string;
  auditedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  branch?: Branch;
  stockItem?: StockItem;
}

export interface DashboardSummary {
  todayGrossSales: number;
  todayDiscounts: number;
  todayOrderCount: number;
  averageTicket: number;
  todayCOGS: number;
  totalTodayExpenses: number;
  todayNetProfit: number;
  cashSales: number;
  mpesaSales: number;
  cardSales: number;
  lowStockCount: number;
  date: string;
}

export interface CartItem {
  menuItem: MenuItem;
  variant?: MenuItemVariant | null;
  quantity: number;
  notes?: string;
  unitPrice: number;
  unitCost: number;
}
