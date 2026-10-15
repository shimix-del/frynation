// Standalone In-Browser Mock Store for GitHub Pages static hosting
import { Branch, Category, MenuItem, StockItem, Shift, Expense, Order, DashboardSummary } from '../types';

const STORAGE_PREFIX = 'nanifrys_standalone_';

const initialBranches: Branch[] = [
  {
    id: 'branch-migadini',
    name: 'Migadini Main Shop',
    code: 'MGD01',
    address: 'Migadini, Mombasa',
    phone: '+254 712 345 678',
    tillNumber: '5428901',
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
    id: 'item-chips-plain',
    categoryId: 'cat-fast-food',
    name: 'Chips Plain (Regular Plate)',
    description: 'Crispy deep-fried fresh potato chips served with sauce and salad',
    basePrice: 150,
    costPrice: 65,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[0],
  },
  {
    id: 'item-chips-masala',
    categoryId: 'cat-fast-food',
    name: 'Chips Masala (Swahili Style)',
    description: 'Spicy tossed potato chips in tomato masala, dhania, and chili sauce',
    basePrice: 200,
    costPrice: 85,
    imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[0],
  },
  {
    id: 'item-chips-kuku',
    categoryId: 'cat-fast-food',
    name: 'Chips & 1/4 Kuku Combo',
    description: 'Full plate chips + 1/4 crispy fried chicken + kachumbari',
    basePrice: 450,
    costPrice: 220,
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[0],
  },
  {
    id: 'item-kuku-choma',
    categoryId: 'cat-meat',
    name: 'Kuku Choma / Fry (Deep Fried)',
    description: 'Golden seasoned deep fried tender chicken with secret marinade',
    basePrice: 400,
    costPrice: 180,
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&q=80',
    isAvailable: true,
    hasVariants: true,
    category: initialCategories[1],
    variants: [
      { id: 'v-14-kuku', menuItemId: 'item-kuku-choma', name: '1/4 Chicken (Kuku Choma)', price: 300, costPrice: 130, isAvailable: true },
      { id: 'v-12-kuku', menuItemId: 'item-kuku-choma', name: '1/2 Chicken (Kuku Choma)', price: 580, costPrice: 250, isAvailable: true },
      { id: 'v-full-kuku', menuItemId: 'item-kuku-choma', name: 'Full Chicken (Kuku Choma)', price: 1100, costPrice: 480, isAvailable: true },
    ],
  },
  {
    id: 'item-beef-pilau',
    categoryId: 'cat-rice',
    name: 'Swahili Beef Pilau',
    description: 'Authentic coastal spiced basmati rice with tender chunks of beef',
    basePrice: 320,
    costPrice: 140,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
    isAvailable: true,
    hasVariants: true,
    category: initialCategories[2],
    variants: [
      { id: 'v-plain-pilau', menuItemId: 'item-beef-pilau', name: 'Plain Pilau Rice', price: 180, costPrice: 70, isAvailable: true },
      { id: 'v-beef-pilau', menuItemId: 'item-beef-pilau', name: 'Beef Pilau', price: 320, costPrice: 140, isAvailable: true },
      { id: 'v-kuku-pilau', menuItemId: 'item-beef-pilau', name: 'Kuku Pilau (with 1/4 Chicken)', price: 460, costPrice: 210, isAvailable: true },
    ],
  },
  {
    id: 'item-chicken-biryani',
    categoryId: 'cat-rice',
    name: 'Coastal Chicken Biryani',
    description: 'Layered saffron aromatic rice with thick rich chicken masala sauce',
    basePrice: 420,
    costPrice: 180,
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80',
    isAvailable: true,
    hasVariants: true,
    category: initialCategories[2],
    variants: [
      { id: 'v-chicken-biryani', menuItemId: 'item-chicken-biryani', name: 'Chicken Biryani', price: 420, costPrice: 180, isAvailable: true },
      { id: 'v-beef-biryani', menuItemId: 'item-chicken-biryani', name: 'Beef Biryani', price: 390, costPrice: 165, isAvailable: true },
    ],
  },
  {
    id: 'item-coke300',
    categoryId: 'cat-drinks',
    name: 'Coca-Cola 300ml Glass Bottle',
    description: 'Chilled classic Coca-Cola glass bottle',
    basePrice: 60,
    costPrice: 35,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-sprite300',
    categoryId: 'cat-drinks',
    name: 'Sprite 300ml Glass Bottle',
    description: 'Chilled lemon-lime Sprite soda',
    basePrice: 60,
    costPrice: 35,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[3],
  },
  {
    id: 'item-fresh-juice',
    categoryId: 'cat-drinks',
    name: 'Freshly Squeezed Juice (500ml)',
    description: '100% pure fresh fruit juice blended daily',
    basePrice: 150,
    costPrice: 60,
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
    isAvailable: true,
    hasVariants: true,
    category: initialCategories[3],
    variants: [
      { id: 'v-passion', menuItemId: 'item-fresh-juice', name: 'Fresh Passion Juice', price: 150, costPrice: 60, isAvailable: true },
      { id: 'v-mango', menuItemId: 'item-fresh-juice', name: 'Fresh Mango Juice', price: 150, costPrice: 60, isAvailable: true },
    ],
  },
  {
    id: 'item-smokie-pasua',
    categoryId: 'cat-snacks',
    name: 'Smokie Pasua (with Kachumbari)',
    description: 'Grilled Farmer\'s Choice smokie sliced open and stuffed with spicy kachumbari',
    basePrice: 60,
    costPrice: 28,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[4],
  },
  {
    id: 'item-sausage-beef',
    categoryId: 'cat-snacks',
    name: 'Fried Beef Sausage (Farmer\'s Choice)',
    description: 'Plump deep-fried Kenyan butcher beef sausage',
    basePrice: 80,
    costPrice: 38,
    imageUrl: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=500&q=80',
    isAvailable: true,
    hasVariants: false,
    category: initialCategories[4],
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

// Initialise storage if first time
if (!localStorage.getItem(STORAGE_PREFIX + 'branches')) {
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
      customerName: 'Customer',
      status: 'COMPLETED',
      subtotal: 380,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 380,
      createdAt: new Date().toISOString(),
      branch: initialBranches[0],
      cashier: { id: 'user-cashier1', name: 'Cashier 1' },
      items: [
        { menuItemId: 'item-beef-pilau', itemName: 'Swahili Beef Pilau', quantity: 1, unitPrice: 320, unitCost: 140, totalPrice: 320 },
        { menuItemId: 'item-coke300', itemName: 'Coca-Cola 300ml Glass Bottle', quantity: 1, unitPrice: 60, unitCost: 35, totalPrice: 60 },
      ],
      payments: [
        { amount: 380, paymentMethod: 'MPESA', mpesaCode: 'QHK8921XLA', status: 'COMPLETED' },
      ],
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

    const token = `mock-token-${matchedUser.id}-${Date.now()}`;
    setStored('currentUser', matchedUser);

    return {
      token,
      user: matchedUser,
      message: 'Login successful (Standalone Mode)',
    };
  },

  getMe: () => {
    const user = getStored<any>('currentUser', initialUsers[0]);
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
    }

    return { activeShift: active };
  },

  openShift: (data: any) => {
    const user = getStored<any>('currentUser', initialUsers[2]);
    const branches = getStored<Branch[]>('branches', initialBranches);
    const branch = branches.find(b => b.id === data.branchId) || branches[0];

    const shift: Shift = {
      id: `shift-${Date.now()}`,
      branchId: branch.id,
      cashierId: user.id,
      openingFloat: Number(data.openingFloat),
      totalCashSales: 0,
      totalMpesaSales: 0,
      totalCardSales: 0,
      totalExpensesPaid: 0,
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
    const actual = Number(data.closingCashActual);
    const expected = (active?.openingFloat || 0) + (active?.totalCashSales || 0);
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
      totalCashAdditions: 0,
      totalCashDrops: 0,
      expectedCashInDrawer: expected,
      actualCountedCash: actual,
      variance,
      totalOrdersCount: active?._count?.orders || 0,
    };

    setStored('activeShift', null);
    return { message: 'Shift closed successfully', shift: active, zReport };
  },

  addCashMovement: () => ({ success: true }),
  getShiftHistory: () => [],

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
    { name: 'Chips & 1/4 Kuku Combo', variant: 'Full Meal', quantity: 38, revenue: 17100, cost: 7180, profit: 9920 },
    { name: 'Swahili Beef Pilau', variant: 'Single Plate', quantity: 29, revenue: 9280, cost: 4060, profit: 5220 },
    { name: 'Chips Masala', variant: 'Spicy', quantity: 32, revenue: 6400, cost: 2560, profit: 3840 },
    { name: 'Chips Plain', variant: 'Regular', quantity: 40, revenue: 6000, cost: 2400, profit: 3600 },
    { name: 'Coca-Cola 300ml', variant: 'Glass Bottle', quantity: 55, revenue: 3300, cost: 1925, profit: 1375 },
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
