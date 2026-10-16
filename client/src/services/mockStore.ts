// Standalone In-Browser Mock Store for GitHub Pages static hosting
import { Branch, Category, MenuItem, StockItem, Shift, Expense, Order, DashboardSummary } from '../types';

const STORAGE_PREFIX = 'nanifrys_standalone_';

const initialBranches: Branch[] = [
  {
    id: 'branch-migadini',
    name: 'Migadini Main Shop',
    code: 'MGD01',
    address: 'Migadini, Mombasa',
    phone: '0143285625',
    tillNumber: null,
    paybillNumber: '247247',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const initialUsers: any[] = [
  {
    id: 'user-robina',
    name: 'Robina',
    email: 'admin@nanifrys.co.ke',
    role: 'OWNER',
    pinCode: '9999',
    branchId: null,
    isActive: true,
  },
  {
    id: 'user-manager',
    name: 'Manager',
    email: 'manager@nanifrys.co.ke',
    role: 'MANAGER',
    pinCode: '1111',
    branchId: 'branch-migadini',
    isActive: true,
  },
  {
    id: 'user-cashier1',
    name: 'Cashier 1',
    email: 'cashier1@nanifrys.co.ke',
    role: 'CASHIER',
    pinCode: '1234',
    branchId: 'branch-migadini',
    isActive: true,
  },
  {
    id: 'user-cashier2',
    name: 'Cashier 2',
    email: 'cashier2@nanifrys.co.ke',
    role: 'CASHIER',
    pinCode: '2345',
    branchId: 'branch-migadini',
    isActive: true,
  },
];

const initialCategories: Category[] = [
  { id: 'cat-fast-food', name: 'Fast Foods & Chips', code: 'fast_foods', sortOrder: 1, icon: 'Flame' },
  { id: 'cat-meat', name: 'Kuku & Meat Dishes', code: 'meat_chicken', sortOrder: 2, icon: 'Drumstick' },
  { id: 'cat-rice', name: 'Swahili Cooked Meals', code: 'cooked_meals', sortOrder: 3, icon: 'Soup' },
  { id: 'cat-drinks', name: 'Drinks & Juices', code: 'drinks_juices', sortOrder: 4, icon: 'CupSoda' },
  { id: 'cat-snacks', name: 'Snacks & Pasua Sides', code: 'snacks_sides', sortOrder: 5, icon: 'Cookie' },
];

const initialMenuItems: MenuItem[] = [
  {
    id: 'item-chips',
    categoryId: 'cat-fast-food',
    name: 'Chips',
    description: 'Crispy golden potato chips',
    basePrice: 100,
    costPrice: 45,
    imageUrl: './images/chips.jpg',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[0],
  },
  {
    id: 'item-chips-mayai',
    categoryId: 'cat-fast-food',
    name: 'Chips Mayai',
    description: 'Crispy chips and eggs bound in double-egg omelette (Zege)',
    basePrice: 180,
    costPrice: 80,
    imageUrl: './images/chips-mayai.jpg',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[0],
  },
  {
    id: 'item-chicken',
    categoryId: 'cat-meat',
    name: 'Chicken',
    description: 'Seasoned golden deep-fried or grilled chicken portion',
    basePrice: 250,
    costPrice: 120,
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[1],
  },
  {
    id: 'item-pilau',
    categoryId: 'cat-rice',
    name: 'Pilau',
    description: 'Authentic coastal Swahili spiced fragrant basmati pilau',
    basePrice: 250,
    costPrice: 110,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[2],
  },
  {
    id: 'item-biriani',
    categoryId: 'cat-rice',
    name: 'Biriani',
    description: 'Aromatic layered coastal Biriani rice with rich savory sauce',
    basePrice: 350,
    costPrice: 150,
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[2],
  },
  {
    id: 'item-viazi-karai',
    categoryId: 'cat-snacks',
    name: 'Viazi Karai',
    description: 'Crispy golden Swahili battered spiced potatoes',
    basePrice: 50,
    costPrice: 20,
    imageUrl: './images/viazi-karai.jpg',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[4],
  },
  {
    id: 'item-sausages',
    categoryId: 'cat-snacks',
    name: 'Sausages',
    description: 'Deep-fried Kenyan butcher beef sausages',
    basePrice: 50,
    costPrice: 25,
    imageUrl: 'https://images.unsplash.com/photo-1585325701165-351af916e581?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[4],
  },
  {
    id: 'item-energy-drink',
    categoryId: 'cat-drinks',
    name: 'Energy Drink',
    description: 'Chilled revitalizing energy drink',
    basePrice: 70,
    costPrice: 45,
    imageUrl: './images/energy-drink.jpg',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-fresh-juice',
    categoryId: 'cat-drinks',
    name: 'Fresh Juice',
    description: '100% pure freshly squeezed and blended tropical juice',
    basePrice: 70,
    costPrice: 35,
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-coca-cola',
    categoryId: 'cat-drinks',
    name: 'Coca-Cola',
    description: 'Chilled classic Coca-Cola soda',
    basePrice: 70,
    costPrice: 40,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-fanta',
    categoryId: 'cat-drinks',
    name: 'Fanta',
    description: 'Chilled vibrant orange Fanta soda',
    basePrice: 70,
    costPrice: 40,
    imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-sprite',
    categoryId: 'cat-drinks',
    name: 'Sprite',
    description: 'Chilled crisp lemon-lime Sprite soda',
    basePrice: 70,
    costPrice: 40,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-stoney',
    categoryId: 'cat-drinks',
    name: 'Stoney',
    description: 'Chilled fiery Stoney Tangawizi ginger soda',
    basePrice: 70,
    costPrice: 40,
    imageUrl: './images/stoney.jpg',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-krest',
    categoryId: 'cat-drinks',
    name: 'Krest',
    description: 'Chilled sparkling Krest Bitter Lemon soda',
    basePrice: 70,
    costPrice: 40,
    imageUrl: './images/krest.jpg',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
];

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage error', e);
  }
}

const STORE_VERSION = 'v6_zreport_lockout_concurrency';

// Initialise storage if first time or version changed
if (localStorage.getItem(STORAGE_PREFIX + 'version') !== STORE_VERSION) {
  setStored('version', STORE_VERSION);
  setStored('branches', initialBranches);
  setStored('users', initialUsers);
  setStored('categories', initialCategories);
  setStored('menu', initialMenuItems);
  setStored('orders', [
    {
      id: 'ord-101',
      orderNumber: 'ORD-20260926-1001',
      branchId: 'branch-migadini',
      cashierId: 'user-cashier1',
      orderType: 'DINE_IN',
      tableNumber: 'T-04',
      customerName: 'Amina Mwangi',
      customerPhone: '0712345678',
      status: 'COMPLETED',
      subtotal: 350,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 350,
      createdAt: new Date().toISOString(),
      branch: initialBranches[0],
      cashier: { id: 'user-cashier1', name: 'Cashier 1' },
      items: [
        { menuItemId: 'item-chips', itemName: 'Chips', quantity: 1, unitPrice: 100, unitCost: 45, totalPrice: 100 },
        { menuItemId: 'item-chicken', itemName: 'Chicken', quantity: 1, unitPrice: 250, unitCost: 120, totalPrice: 250 },
      ],
      payments: [
        { amount: 350, paymentMethod: 'MPESA', mpesaCode: 'QHK8921XLA', status: 'COMPLETED' },
      ],
    },
    {
      id: 'ord-102',
      orderNumber: 'ORD-20260926-1002',
      branchId: 'branch-migadini',
      cashierId: 'user-cashier1',
      orderType: 'TAKEAWAY',
      tableNumber: null,
      customerName: 'John Otieno',
      customerPhone: '0722001122',
      status: 'COMPLETED',
      subtotal: 250,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 250,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      branch: initialBranches[0],
      cashier: { id: 'user-cashier1', name: 'Cashier 1' },
      items: [
        { menuItemId: 'item-chips-mayai', itemName: 'Chips Mayai', quantity: 1, unitPrice: 180, unitCost: 80, totalPrice: 180 },
        { menuItemId: 'item-stoney', itemName: 'Stoney', quantity: 1, unitPrice: 70, unitCost: 40, totalPrice: 70 },
      ],
      payments: [
        { amount: 250, paymentMethod: 'CASH', cashTendered: 500, changeAmount: 250, status: 'COMPLETED' },
      ],
    },
    {
      id: 'ord-103',
      orderNumber: 'ORD-20260926-1003',
      branchId: 'branch-migadini',
      cashierId: 'user-cashier2',
      orderType: 'DINE_IN',
      tableNumber: 'T-02',
      customerName: 'Fatma Bakari',
      customerPhone: '0733887766',
      status: 'COMPLETED',
      subtotal: 320,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 320,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      branch: initialBranches[0],
      cashier: { id: 'user-cashier2', name: 'Cashier 2' },
      items: [
        { menuItemId: 'item-pilau', itemName: 'Pilau', quantity: 1, unitPrice: 250, unitCost: 110, totalPrice: 250 },
        { menuItemId: 'item-coca-cola', itemName: 'Coca-Cola', quantity: 1, unitPrice: 70, unitCost: 40, totalPrice: 70 },
      ],
      payments: [
        { amount: 320, paymentMethod: 'MPESA', mpesaCode: 'RAK72199BN', status: 'COMPLETED' },
      ],
    },
    {
      id: 'ord-104',
      orderNumber: 'ORD-20260926-1004',
      branchId: 'branch-migadini',
      cashierId: 'user-cashier1',
      orderType: 'TAKEAWAY',
      tableNumber: null,
      customerName: 'Hamisi Juma',
      customerPhone: null,
      status: 'COMPLETED',
      subtotal: 170,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 170,
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      branch: initialBranches[0],
      cashier: { id: 'user-cashier1', name: 'Cashier 1' },
      items: [
        { menuItemId: 'item-viazi-karai', itemName: 'Viazi Karai', quantity: 2, unitPrice: 50, unitCost: 20, totalPrice: 100 },
        { menuItemId: 'item-energy-drink', itemName: 'Energy Drink', quantity: 1, unitPrice: 70, unitCost: 45, totalPrice: 70 },
      ],
      payments: [
        { amount: 170, paymentMethod: 'CASH', cashTendered: 200, changeAmount: 30, status: 'COMPLETED' },
      ],
    },
  ]);
  setStored('shiftHistory', [
    {
      id: 'shift-prev-101',
      branchId: 'branch-migadini',
      cashierId: 'user-cashier1',
      openingFloat: 2500,
      totalCashSales: 9800,
      totalMpesaSales: 16400,
      totalCardSales: 0,
      totalExpensesPaid: 1400,
      status: 'CLOSED',
      openedAt: new Date(Date.now() - 86400000).toISOString(),
      closedAt: new Date(Date.now() - 50400000).toISOString(),
      closingCashActual: 12300,
      closingCashExpected: 12300,
      variance: 0,
      notes: 'Evening shift closed balanced. All cash drawer counted and verified.',
      branch: initialBranches[0],
      cashier: { id: 'user-cashier1', name: 'Cashier 1', role: 'CASHIER' },
      _count: { orders: 36 },
    },
    {
      id: 'shift-prev-100',
      branchId: 'branch-migadini',
      cashierId: 'user-cashier2',
      openingFloat: 2000,
      totalCashSales: 8400,
      totalMpesaSales: 14200,
      totalCardSales: 0,
      totalExpensesPaid: 2800,
      status: 'CLOSED',
      openedAt: new Date(Date.now() - 172800000).toISOString(),
      closedAt: new Date(Date.now() - 136800000).toISOString(),
      closingCashActual: 10400,
      closingCashExpected: 10400,
      variance: 0,
      notes: 'Shift completed and reconciled with zero variance.',
      branch: initialBranches[0],
      cashier: { id: 'user-cashier2', name: 'Cashier 2', role: 'CASHIER' },
      _count: { orders: 31 },
    },
  ]);
  setStored('expenses', [
    {
      id: 'exp-1',
      branchId: 'branch-migadini',
      category: 'MARKET_PRODUCE',
      amount: 1400,
      description: 'Morning fresh tomatoes, coriander & red onions from market',
      paidTo: 'Veggies Supplier',
      paymentSource: 'CASH_DRAWER',
      receiptNumber: 'WAK-904',
      createdAt: new Date().toISOString(),
      branch: { id: 'branch-migadini', name: 'Migadini Main Shop', code: 'MGD01' },
    },
    {
      id: 'exp-2',
      branchId: 'branch-migadini',
      category: 'GAS_CHARCOAL',
      amount: 2800,
      description: 'TotalEnergies 13kg Gas cylinder refill for main fryers',
      paidTo: 'Gas Station',
      paymentSource: 'BANK_MPESA',
      receiptNumber: 'TOT-4821',
      createdAt: new Date().toISOString(),
      branch: { id: 'branch-migadini', name: 'Migadini Main Shop', code: 'MGD01' },
    },
  ]);
  setStored('inventory', [
    { id: 'inv-1', branchId: 'branch-migadini', name: 'Potatoes (Shangi)', type: 'RAW_INGREDIENT', unit: 'kg', currentStock: 120, minStockAlert: 25, unitCost: 70, supplierName: 'Farmers Co-op' },
    { id: 'inv-2', branchId: 'branch-migadini', name: 'Raw Chicken (Whole/Cut)', type: 'RAW_INGREDIENT', unit: 'kg', currentStock: 80, minStockAlert: 20, unitCost: 380, supplierName: 'Kenchic Supplies' },
    { id: 'inv-3', branchId: 'branch-migadini', name: 'Basmati Rice (Grade 1)', type: 'RAW_INGREDIENT', unit: 'kg', currentStock: 95, minStockAlert: 20, unitCost: 160, supplierName: 'Rice Millers' },
    { id: 'inv-4', branchId: 'branch-migadini', name: 'Cooking Oil (Rina)', type: 'RAW_INGREDIENT', unit: 'litre', currentStock: 50, minStockAlert: 15, unitCost: 240, supplierName: 'Bidco Africa' },
    { id: 'inv-5', branchId: 'branch-migadini', name: 'Smokies Pack (Farmer\'s Choice)', type: 'PACKAGED_UNIT', unit: 'piece', currentStock: 150, minStockAlert: 30, unitCost: 28, supplierName: 'Farmer\'s Choice' },
    { id: 'inv-6', branchId: 'branch-migadini', name: 'Coca-Cola 300ml Glass', type: 'PACKAGED_UNIT', unit: 'bottle', currentStock: 144, minStockAlert: 24, unitCost: 35, supplierName: 'Nairobi Bottlers' },
  ]);
}

export const mockStore = {
  login: (credentials: { email?: string; password?: string; pinCode?: string; branchId?: string }) => {
    const users = getStored<any[]>('users', initialUsers);
    let matchedUser = null;

    if (credentials.pinCode) {
      matchedUser = users.find(u => u.pinCode === credentials.pinCode);
    } else if (credentials.email) {
      matchedUser = users.find(u => u.email.toLowerCase() === credentials.email?.toLowerCase());
    }

    if (!matchedUser) {
      throw new Error('Invalid credentials. Check PIN or Email.');
    }

    // Only one cashier can run a shift at a time; two shifts cannot run concurrently
    const activeShift = getStored<Shift | null>('activeShift', null);
    if (activeShift && activeShift.status === 'OPEN') {
      if (matchedUser.role === 'CASHIER' && activeShift.cashierId && activeShift.cashierId !== matchedUser.id) {
        const activeName = activeShift.cashier?.name || 'Another cashier';
        throw new Error(
          `Shift in Progress: ${activeName} is currently on an active shift. Only one cashier can run a shift at a time. Two shifts cannot run concurrently. ${activeName} must close their shift first.`
        );
      }
    }

    const token = `mock-token-${matchedUser.id}-${Date.now()}`;
    setStored('currentUser', matchedUser);

    return {
      token,
      user: matchedUser,
      message: 'Login successful (Standalone Mode)',
    };
  },

  getMe: () => {
    const user = getStored<any>('currentUser', null);
    return user;
  },

  getUsers: () => getStored<any[]>('users', initialUsers),

  createUser: (userData: any) => {
    const users = getStored<any[]>('users', initialUsers);
    const newUser = { id: `user-${Date.now()}`, ...userData, isActive: true };
    users.push(newUser);
    setStored('users', users);
    return newUser;
  },

  getBranches: () => getStored<Branch[]>('branches', initialBranches),
  getBranch: (id: string) => {
    const branches = getStored<Branch[]>('branches', initialBranches);
    return branches.find(b => b.id === id) || branches[0];
  },
  createBranch: (branchData: any) => {
    const branches = getStored<Branch[]>('branches', initialBranches);
    const newB: Branch = { id: `branch-${Date.now()}`, ...branchData, createdAt: new Date().toISOString() };
    branches.push(newB);
    setStored('branches', branches);
    return newB;
  },
  updateBranch: (id: string, branchData: any) => {
    const branches = getStored<Branch[]>('branches', initialBranches);
    const idx = branches.findIndex(b => b.id === id);
    if (idx !== -1) {
      branches[idx] = { ...branches[idx], ...branchData };
      setStored('branches', branches);
      return branches[idx];
    }
    return branchData;
  },

  getCategories: () => getStored<Category[]>('categories', initialCategories),
  createCategory: (catData: any) => {
    const cats = getStored<Category[]>('categories', initialCategories);
    const newCat = { id: `cat-${Date.now()}`, ...catData };
    cats.push(newCat);
    setStored('categories', cats);
    return newCat;
  },

  getMenu: (params?: { categoryId?: string; search?: string; availableOnly?: boolean }) => {
    let items = getStored<MenuItem[]>('menu', initialMenuItems);
    if (params?.categoryId) items = items.filter(i => i.categoryId === params.categoryId);
    if (params?.search) {
      const s = params.search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(s));
    }
    if (params?.availableOnly) items = items.filter(i => i.isAvailable);
    return items;
  },

  createMenuItem: (itemData: any) => {
    const items = getStored<MenuItem[]>('menu', initialMenuItems);
    const newItem: MenuItem = { id: `item-${Date.now()}`, ...itemData };
    items.push(newItem);
    setStored('menu', items);
    return newItem;
  },

  updateMenuItem: (id: string, itemData: any) => {
    const items = getStored<MenuItem[]>('menu', initialMenuItems);
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...itemData };
      setStored('menu', items);
      return items[idx];
    }
    return itemData;
  },

  toggleStock: (id: string) => {
    const items = getStored<MenuItem[]>('menu', initialMenuItems);
    const item = items.find(i => i.id === id);
    if (item) {
      item.isAvailable = !item.isAvailable;
      setStored('menu', items);
      return item;
    }
    return null;
  },

  deleteMenuItem: (id: string) => {
    let items = getStored<MenuItem[]>('menu', initialMenuItems);
    items = items.filter(i => i.id !== id);
    setStored('menu', items);
    return { success: true };
  },

  getInventory: (params?: { branchId?: string; type?: string; search?: string }) => {
    let list = getStored<StockItem[]>('inventory', []);
    if (params?.branchId) list = list.filter(i => i.branchId === params.branchId);
    if (params?.type) list = list.filter(i => i.type === params.type);
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(s));
    }
    return list;
  },

  createStockItem: (itemData: any) => {
    const list = getStored<StockItem[]>('inventory', []);
    const newItem = { id: `inv-${Date.now()}`, ...itemData };
    list.push(newItem);
    setStored('inventory', list);
    return newItem;
  },

  updateStockItem: (id: string, itemData: any) => {
    const list = getStored<StockItem[]>('inventory', []);
    const idx = list.findIndex(i => i.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...itemData };
      setStored('inventory', list);
      return list[idx];
    }
    return itemData;
  },

  deleteStockItem: (id: string) => {
    let list = getStored<StockItem[]>('inventory', []);
    list = list.filter(i => i.id !== id);
    setStored('inventory', list);
    return { success: true };
  },

  restock: (data: any) => {
    const list = getStored<StockItem[]>('inventory', []);
    const item = list.find(i => i.id === data.stockItemId);
    if (item) {
      item.currentStock += Number(data.quantityAdded);
      setStored('inventory', list);
      return item;
    }
    return null;
  },

  transferStock: (data: any) => {
    return { success: true, message: 'Stock transferred successfully (Standalone)' };
  },

  auditStock: (data: any) => {
    const list = getStored<StockItem[]>('inventory', []);
    const item = list.find(i => i.id === data.stockItemId);
    if (item) {
      item.currentStock = Number(data.countedStock);
      setStored('inventory', list);
      return item;
    }
    return null;
  },

  getStockTransfers: () => [],
  getStockAudits: () => [],
  getRecipes: () => [],
  createRecipe: (data: any) => ({ id: `rec-${Date.now()}`, ...data }),
  deleteRecipe: (id: string) => ({ success: true }),

  getOrders: (params?: { branchId?: string; status?: string; search?: string }) => {
    let orders = getStored<Order[]>('orders', []);
    if (params?.branchId) orders = orders.filter(o => o.branchId === params.branchId);
    if (params?.status) orders = orders.filter(o => o.status === params.status);
    return orders;
  },

  getHeldOrders: (params?: { branchId?: string }) => {
    let orders = getStored<Order[]>('orders', []);
    orders = orders.filter(o => o.status === 'HELD');
    if (params?.branchId) orders = orders.filter(o => o.branchId === params.branchId);
    return orders;
  },

  createOrder: (orderData: any) => {
    const orders = getStored<Order[]>('orders', []);
    const branches = getStored<Branch[]>('branches', initialBranches);
    const users = getStored<any[]>('users', initialUsers);

    const branch = branches.find(b => b.id === orderData.branchId) || branches[0];
    const user = getStored<any>('currentUser', users[0]);

    const processedItems = (orderData.items || []).map((i: any) => {
      const q = Number(i.quantity) || 1;
      const up = Number(i.unitPrice) || 0;
      const tp = i.totalPrice !== undefined ? Number(i.totalPrice) : q * up;
      return {
        id: `oi-${Date.now()}-${Math.random()}`,
        menuItemId: i.menuItemId,
        variantId: i.variantId || null,
        itemName: i.itemName,
        variantName: i.variantName || null,
        quantity: q,
        unitPrice: up,
        unitCost: Number(i.unitCost) || 0,
        totalPrice: tp,
        notes: i.notes || null,
      };
    });

    const calculatedSubtotal = processedItems.reduce((acc: number, it: any) => acc + it.totalPrice, 0);
    const disc = Number(orderData.discountAmount || 0);
    const subtotal = Number(orderData.subtotal) || calculatedSubtotal;
    const totalAmount = Number(orderData.totalAmount) || Math.max(0, subtotal - disc);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: branch.id,
      cashierId: user.id,
      shiftId: orderData.shiftId || null,
      orderType: orderData.orderType || 'DINE_IN',
      tableNumber: orderData.tableNumber || null,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      status: orderData.status || 'COMPLETED',
      subtotal,
      discountAmount: disc,
      discountReason: orderData.discountReason || null,
      taxAmount: 0,
      totalAmount,
      notes: orderData.notes || null,
      createdAt: new Date().toISOString(),
      branch,
      cashier: { id: user.id, name: user.name },
      items: processedItems,
      payments: (orderData.payments || []).map((p: any) => ({
        id: `pay-${Date.now()}-${Math.random()}`,
        paymentMethod: p.paymentMethod,
        amount: Number(p.amount) || totalAmount,
        cashTendered: p.cashTendered || null,
        changeAmount: p.changeAmount || null,
        mpesaCode: p.mpesaCode || null,
        status: 'COMPLETED',
      })),
    };

    orders.unshift(newOrder);
    setStored('orders', orders);

    // Update active shift in local store so shifts and reports reflect immediately
    const activeShift = getStored<any>('activeShift', null);
    if (activeShift) {
      let cashAmt = 0;
      let mpesaAmt = 0;
      (newOrder.payments || []).forEach((p: any) => {
        if (p.paymentMethod === 'CASH') cashAmt += Number(p.amount);
        else if (p.paymentMethod === 'MPESA') mpesaAmt += Number(p.amount);
        else if (p.paymentMethod === 'SPLIT') {
          if (p.mpesaCode) mpesaAmt += Number(p.amount);
          else cashAmt += Number(p.amount);
        }
      });
      activeShift.totalCashSales = (activeShift.totalCashSales || 0) + cashAmt;
      activeShift.totalMpesaSales = (activeShift.totalMpesaSales || 0) + mpesaAmt;
      const cashAdditions = activeShift.cashAdditions || 0;
      const totalExpensesPaid = activeShift.totalExpensesPaid || 0;
      activeShift.expectedCash = (activeShift.openingFloat || 0) + activeShift.totalCashSales + cashAdditions - totalExpensesPaid;
      if (!activeShift.orders) activeShift.orders = [];
      activeShift.orders.unshift(newOrder);
      setStored('activeShift', activeShift);
    }

    return {
      order: newOrder,
      warnings: [],
      message: 'Order created successfully',
    };
  },

  resumeOrder: (id: string, paymentData: any) => {
    const orders = getStored<Order[]>('orders', []);
    const ord = orders.find(o => o.id === id);
    if (ord) {
      ord.status = 'COMPLETED';
      ord.payments = paymentData.payments || [];
      setStored('orders', orders);
      return ord;
    }
    return null;
  },

  cancelOrder: (id: string) => {
    const orders = getStored<Order[]>('orders', []);
    const ord = orders.find(o => o.id === id);
    if (ord) {
      ord.status = 'CANCELLED';
      setStored('orders', orders);
    }
    return { success: true };
  },

  getCurrentShift: (params?: { branchId?: string }) => {
    const active = getStored<Shift | null>('activeShift', null);

    if (active) {
      const orders = (active as any).orders || [];
      const itemMap = new Map<string, { itemName: string; variantName: string | null; quantity: number; totalPrice: number }>();
      orders.forEach((ord: any) => {
        (ord.items || []).forEach((item: any) => {
          const key = `${item.itemName}___${item.variantName || ''}`;
          const existing = itemMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.totalPrice += item.totalPrice;
          } else {
            itemMap.set(key, {
              itemName: item.itemName,
              variantName: item.variantName || null,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            });
          }
        });
      });
      (active as any).itemsSold = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);

      if (!active.cashMovements) active.cashMovements = [];
      const cashAdditions = active.cashMovements
        .filter(m => m.type === 'FLOAT_IN')
        .reduce((sum, m) => sum + m.amount, 0);
      const cashPayouts = active.cashMovements
        .filter(m => m.type === 'PAYOUT' || (m as any).type === 'CASH_DROP')
        .reduce((sum, m) => sum + m.amount, 0);
      active.cashAdditions = cashAdditions;
      active.cashDrops = cashPayouts;
      active.totalExpensesPaid = Math.max(active.totalExpensesPaid || 0, cashPayouts);
      active.expectedCash = (active.openingFloat || 0) + (active.totalCashSales || 0) + cashAdditions - active.totalExpensesPaid;
    }

    return { activeShift: active };
  },

  openShift: (data: any) => {
    const existing = getStored<Shift | null>('activeShift', null);
    if (existing && existing.status === 'OPEN') {
      const activeName = existing.cashier?.name || 'A cashier';
      throw new Error(`A shift is already active (${activeName}). Two shifts cannot run concurrently. Please close the active shift first.`);
    }

    const user = getStored<any>('currentUser', initialUsers[2]);
    const branches = getStored<Branch[]>('branches', initialBranches);
    const branch = branches.find(b => b.id === data.branchId) || branches[0];
    const floatAmt = Number(data.openingFloat) || 0;

    const shift: Shift = {
      id: `shift-${Date.now()}`,
      branchId: branch.id,
      cashierId: user.id,
      openingFloat: floatAmt,
      totalCashSales: 0,
      totalMpesaSales: 0,
      totalCardSales: 0,
      totalExpensesPaid: 0,
      cashAdditions: 0,
      cashDrops: 0,
      expectedCash: floatAmt,
      cashMovements: [],
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      closedAt: null,
      closingCashActual: null,
      closingCashExpected: null,
      variance: null,
      notes: data.notes || null,
      branch,
      cashier: { id: user.id, name: user.name, role: user.role },
      _count: { orders: 0 },
    };

    setStored('activeShift', shift);
    return shift;
  },

  closeShift: (data: any) => {
    const active = getStored<Shift | null>('activeShift', null);
    const actual = Number(data.closingCashActual) || 0;
    const movements = active?.cashMovements || [];
    const cashAdditions = movements
      .filter(m => m.type === 'FLOAT_IN')
      .reduce((sum, m) => sum + m.amount, 0);
    const cashPayouts = movements
      .filter(m => m.type === 'PAYOUT' || (m as any).type === 'CASH_DROP')
      .reduce((sum, m) => sum + m.amount, 0);
    const expensesPaid = Math.max(active?.totalExpensesPaid || 0, cashPayouts);

    const expected = (active?.openingFloat || 0) + (active?.totalCashSales || 0) + cashAdditions - expensesPaid;
    const variance = actual - expected;

    const zReport = {
      zReportNumber: `Z-MGD-${Date.now().toString().slice(-4)}`,
      branchName: active?.branch?.name || 'Migadini Main Shop',
      cashierName: active?.cashier?.name || 'Cashier',
      openedAt: active?.openedAt || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openingFloat: active?.openingFloat || 0,
      totalCashSales: active?.totalCashSales || 0,
      totalMpesaSales: active?.totalMpesaSales || 0,
      totalCardSales: active?.totalCardSales || 0,
      totalGrossSales: (active?.totalCashSales || 0) + (active?.totalMpesaSales || 0) + (active?.totalCardSales || 0),
      totalCashAdditions: cashAdditions,
      totalCashDrops: cashPayouts,
      expectedCashInDrawer: expected,
      actualCountedCash: actual,
      variance,
      cashMovements: movements,
      totalOrdersCount: active?._count?.orders || (active as any)?.orders?.length || 0,
    };

    const history = getStored<Shift[]>('shiftHistory', []);
    const closedShiftRecord: Shift = {
      ...(active || {}),
      id: active?.id || `shift-${Date.now()}`,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closingCashActual: actual,
      closingCashExpected: expected,
      variance,
      cashMovements: movements,
      cashAdditions,
      cashDrops: cashPayouts,
      totalExpensesPaid: expensesPaid,
      notes: data.notes || active?.notes || null,
      branch: active?.branch || initialBranches[0],
      cashier: active?.cashier || { id: 'user-cashier1', name: 'Cashier' },
      _count: { orders: active?._count?.orders || (active as any)?.orders?.length || 0 },
    } as Shift;

    history.unshift(closedShiftRecord);
    setStored('shiftHistory', history);
    setStored('activeShift', null);
    return { message: 'Shift closed successfully', shift: closedShiftRecord, zReport };
  },

  addCashMovement: (data: any) => {
    const active = getStored<Shift | null>('activeShift', null);
    if (!active) {
      return { success: false, error: 'No active shift found' };
    }

    const movement: any = {
      id: `cm-${Date.now()}`,
      shiftId: active.id,
      branchId: active.branchId,
      type: data.type, // 'FLOAT_IN' | 'PAYOUT'
      amount: Number(data.amount) || 0,
      reason: data.reason || (data.type === 'FLOAT_IN' ? 'Float In' : 'Payout'),
      authorizedBy: data.authorizedBy || active.cashier?.name || 'Cashier',
      createdAt: new Date().toISOString(),
    };

    if (!active.cashMovements) {
      active.cashMovements = [];
    }
    active.cashMovements.unshift(movement);

    const cashAdditions = active.cashMovements
      .filter(m => m.type === 'FLOAT_IN')
      .reduce((sum, m) => sum + m.amount, 0);
    const cashPayouts = active.cashMovements
      .filter(m => m.type === 'PAYOUT' || (m as any).type === 'CASH_DROP')
      .reduce((sum, m) => sum + m.amount, 0);

    active.cashAdditions = cashAdditions;
    active.cashDrops = cashPayouts;
    active.totalExpensesPaid = Math.max(active.totalExpensesPaid || 0, cashPayouts);
    active.expectedCash = (active.openingFloat || 0) + (active.totalCashSales || 0) + cashAdditions - active.totalExpensesPaid;

    setStored('activeShift', active);
    return { success: true, movement };
  },

  getShiftHistory: (params?: { branchId?: string }) => {
    let history = getStored<Shift[]>('shiftHistory', []);
    if (params?.branchId) history = history.filter(s => s.branchId === params.branchId);
    return history;
  },

  getExpenses: (params?: { branchId?: string }) => {
    let list = getStored<Expense[]>('expenses', []);
    if (params?.branchId) list = list.filter(e => e.branchId === params.branchId);
    const total = list.reduce((acc, curr) => acc + curr.amount, 0);
    return { totalAmount: total, count: list.length, expenses: list };
  },

  createExpense: (data: any) => {
    const list = getStored<Expense[]>('expenses', []);
    const branches = getStored<Branch[]>('branches', initialBranches);
    const branch = branches.find(b => b.id === data.branchId) || branches[0];

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      branchId: branch.id,
      shiftId: data.shiftId || null,
      category: data.category,
      amount: Number(data.amount),
      description: data.description,
      paidTo: data.paidTo || null,
      paymentSource: data.paymentSource || 'CASH_DRAWER',
      receiptNumber: data.receiptNumber || null,
      createdAt: new Date().toISOString(),
      branch: { id: branch.id, name: branch.name, code: branch.code },
    };

    list.unshift(newExp);
    setStored('expenses', list);

    if (newExp.paymentSource === 'CASH_DRAWER') {
      const active = getStored<Shift | null>('activeShift', null);
      if (active) {
        active.totalExpensesPaid = (active.totalExpensesPaid || 0) + newExp.amount;
        const cashAdditions = active.cashAdditions || 0;
        active.expectedCash = (active.openingFloat || 0) + (active.totalCashSales || 0) + cashAdditions - active.totalExpensesPaid;
        setStored('activeShift', active);
      }
    }

    return newExp;
  },

  deleteExpense: (id: string) => {
    let list = getStored<Expense[]>('expenses', []);
    list = list.filter(e => e.id !== id);
    setStored('expenses', list);
    return { success: true };
  },

  getDashboardSummary: (params?: { branchId?: string }): DashboardSummary => {
    const orders = getStored<Order[]>('orders', []);
    const expenses = getStored<Expense[]>('expenses', []);

    const relevantOrders = params?.branchId ? orders.filter(o => o.branchId === params.branchId) : orders;
    const relevantExpenses = params?.branchId ? expenses.filter(e => e.branchId === params.branchId) : expenses;

    const totalRevenue = relevantOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const totalExpenses = relevantExpenses.reduce((acc, e) => acc + e.amount, 0);
    const estimatedCOGS = totalRevenue * 0.42;
    const netProfit = totalRevenue - estimatedCOGS - totalExpenses;

    return {
      todayGrossSales: totalRevenue || 28500,
      todayDiscounts: 0,
      todayOrderCount: relevantOrders.length || 42,
      averageTicket: relevantOrders.length ? Math.round(totalRevenue / relevantOrders.length) : 450,
      todayCOGS: Math.round(estimatedCOGS) || 11970,
      totalTodayExpenses: totalExpenses || 4200,
      todayNetProfit: Math.round(netProfit) || 12330,
      cashSales: Math.round(totalRevenue * 0.35) || 10000,
      mpesaSales: Math.round(totalRevenue * 0.65) || 18500,
      cardSales: 0,
      lowStockCount: 1,
      date: new Date().toISOString(),
    };
  },

  getSalesByCategory: (_params?: any) => [
    { name: 'Fast Foods & Chips', revenue: 14200, quantity: 48 },
    { name: 'Kuku & Meat Dishes', revenue: 18400, quantity: 28 },
    { name: 'Swahili Cooked Meals', revenue: 12600, quantity: 35 },
    { name: 'Drinks & Juices', revenue: 6800, quantity: 64 },
    { name: 'Snacks & Pasua Sides', revenue: 2400, quantity: 40 },
  ],

  getTopItems: () => [
    { name: 'Chicken', variant: 'Piece', quantity: 38, revenue: 9500, cost: 4560, profit: 4940 },
    { name: 'Biriani', variant: 'Plate', quantity: 29, revenue: 10150, cost: 4350, profit: 5800 },
    { name: 'Pilau', variant: 'Plate', quantity: 32, revenue: 8000, cost: 3520, profit: 4480 },
    { name: 'Chips', variant: 'Plate', quantity: 40, revenue: 4000, cost: 1800, profit: 2200 },
    { name: 'Chips Mayai', variant: 'Zege', quantity: 35, revenue: 6300, cost: 2800, profit: 3500 },
  ],

  getHourlySales: () => [
    { hour: '08:00', sales: 1200, orderCount: 4 },
    { hour: '10:00', sales: 2400, orderCount: 8 },
    { hour: '12:00', sales: 8600, orderCount: 24 },
    { hour: '13:00', sales: 11200, orderCount: 28 },
    { hour: '15:00', sales: 4500, orderCount: 12 },
    { hour: '17:00', sales: 6800, orderCount: 18 },
    { hour: '19:00', sales: 8900, orderCount: 22 },
  ],

  getBranchComparison: () => [
    { branchId: 'branch-migadini', branchName: 'Migadini Main Shop', branchCode: 'MGD01', totalOrders: 65, totalSales: 28500, totalExpenses: 4200, totalCOGS: 11970, netProfit: 12330 },
  ],

  getCashierPerformance: () => [
    { cashierId: 'user-cashier1', name: 'Cashier 1', role: 'CASHIER', branchName: 'Migadini Main Shop', orderCount: 24, totalSales: 11200, avgTicket: 466 },
    { cashierId: 'user-cashier2', name: 'Cashier 2', role: 'CASHIER', branchName: 'Migadini Main Shop', orderCount: 20, totalSales: 8900, avgTicket: 445 },
  ],

  getProfitLoss: () => ({
    grossSales: 40900,
    cogs: 16360,
    grossProfit: 24540,
    expenses: 4200,
    netProfit: 20340,
    marginPercent: 49.7,
  }),
};
