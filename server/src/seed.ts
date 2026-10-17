import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DESTRUCTIVE_DEMO_SEED !== 'true') {
    throw new Error('Demo seed deletes existing data. Use only on a disposable development database with ALLOW_DESTRUCTIVE_DEMO_SEED=true.');
  }
  console.log('🌱 Seeding NANI FRYS database with restaurant data...');

  // Clean existing data
  await prisma.cashMovement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.stockAudit.deleteMany();
  await prisma.menuItemRecipe.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  // 1. Create Branches
  console.log('Creating branches...');
  const migadini = await prisma.branch.create({
    data: {
      name: 'Migadini Main Shop',
      code: 'MGD01',
      address: 'Migadini, Mombasa',
      phone: '0143285625',
      tillNumber: null,
      paybillNumber: '247247',
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      name: 'Branch 2 - Express',
      code: 'EXP02',
      address: 'Express Outlet',
      phone: '0143285625',
      tillNumber: null,
      paybillNumber: '247247',
      isActive: true,
    },
  });

  // 2. Create Users
  console.log('Creating users...');
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const managerPasswordHash = await bcrypt.hash('manager123', salt);
  const cashierPasswordHash = await bcrypt.hash('cashier123', salt);

  const owner = await prisma.user.create({
    data: {
      name: 'Robina',
      email: 'admin@nanifrys.co.ke',
      phone: '+254 700 000 001',
      role: 'OWNER',
      pinCode: '9878',
      passwordHash: adminPasswordHash,
      branchId: null, // Owner oversees all branches
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Manager',
      email: 'manager@nanifrys.co.ke',
      phone: '+254 711 111 222',
      role: 'MANAGER',
      pinCode: '5609',
      passwordHash: managerPasswordHash,
      branchId: migadini.id,
    },
  });

  const cashier1 = await prisma.user.create({
    data: {
      name: 'Cashier 1',
      email: 'cashier1@nanifrys.co.ke',
      phone: '+254 722 222 331',
      role: 'CASHIER',
      pinCode: '1298',
      passwordHash: cashierPasswordHash,
      branchId: migadini.id,
    },
  });

  const cashier2 = await prisma.user.create({
    data: {
      name: 'Cashier 2',
      email: 'cashier2@nanifrys.co.ke',
      phone: '+254 722 222 332',
      role: 'CASHIER',
      pinCode: '1349',
      passwordHash: cashierPasswordHash,
      branchId: migadini.id,
    },
  });

  const cashier3 = await prisma.user.create({
    data: {
      name: 'Cashier 3',
      email: 'cashier3@nanifrys.co.ke',
      phone: '+254 722 222 333',
      role: 'CASHIER',
      pinCode: '3456',
      passwordHash: cashierPasswordHash,
      branchId: migadini.id,
    },
  });

  const cashier4 = await prisma.user.create({
    data: {
      name: 'Cashier 4',
      email: 'cashier4@nanifrys.co.ke',
      phone: '+254 722 222 334',
      role: 'CASHIER',
      pinCode: '4567',
      passwordHash: cashierPasswordHash,
      branchId: migadini.id,
    },
  });

  // 3. Create Categories
  console.log('Creating categories...');
  const catFastFood = await prisma.category.create({
    data: { name: 'Fast Foods & Chips', code: 'fast_foods', sortOrder: 1, icon: 'Flame' },
  });
  const catMeat = await prisma.category.create({
    data: { name: 'Kuku & Meat Dishes', code: 'meat_chicken', sortOrder: 2, icon: 'Drumstick' },
  });
  const catRice = await prisma.category.create({
    data: { name: 'Swahili Cooked Meals', code: 'cooked_meals', sortOrder: 3, icon: 'Soup' },
  });
  const catDrinks = await prisma.category.create({
    data: { name: 'Drinks & Juices', code: 'drinks_juices', sortOrder: 4, icon: 'CupSoda' },
  });
  const catSnacks = await prisma.category.create({
    data: { name: 'Snacks & Pasua Sides', code: 'snacks_sides', sortOrder: 5, icon: 'Cookie' },
  });

  // 4. Create Stock Items for each branch
  console.log('Creating stock items...');
  const branches = [migadini, branch2];
  const stockMap: Record<string, Record<string, string>> = {};

  for (const b of branches) {
    stockMap[b.id] = {};

    const items = [
      { name: 'Potatoes (Shangi)', type: 'RAW_INGREDIENT', unit: 'kg', stock: 120, min: 25, cost: 70, supplier: 'Kinangop Farmers Co-op' },
      { name: 'Raw Chicken (Whole/Cut)', type: 'RAW_INGREDIENT', unit: 'kg', stock: 80, min: 20, cost: 380, supplier: 'Kenchic Supplies' },
      { name: 'Basmati Rice (Grade 1)', type: 'RAW_INGREDIENT', unit: 'kg', stock: 95, min: 20, cost: 160, supplier: 'Mwea Rice Millers' },
      { name: 'Fresh Beef (Stew Cut)', type: 'RAW_INGREDIENT', unit: 'kg', stock: 65, min: 15, cost: 520, supplier: 'Dagoretti Slaughterhouse' },
      { name: 'Cooking Oil (Rina/Elianto)', type: 'RAW_INGREDIENT', unit: 'litre', stock: 50, min: 15, cost: 240, supplier: 'Bidco Africa' },
      { name: 'Tomatoes & Onions', type: 'RAW_INGREDIENT', unit: 'kg', stock: 45, min: 10, cost: 90, supplier: 'Wakulima Market' },
      { name: 'Pilau & Biryani Spices', type: 'RAW_INGREDIENT', unit: 'pack', stock: 40, min: 8, cost: 120, supplier: 'Tropical Spices Mombasa' },
      { name: 'Smokies Pack (Farmer\'s Choice)', type: 'PACKAGED_UNIT', unit: 'piece', stock: 150, min: 30, cost: 28, supplier: 'Farmer\'s Choice' },
      { name: 'Beef Sausages', type: 'PACKAGED_UNIT', unit: 'piece', stock: 100, min: 25, cost: 38, supplier: 'Farmer\'s Choice' },
      { name: 'Coca-Cola 300ml Glass', type: 'PACKAGED_UNIT', unit: 'bottle', stock: 144, min: 24, cost: 35, supplier: 'Nairobi Bottlers' },
      { name: 'Sprite 300ml Glass', type: 'PACKAGED_UNIT', unit: 'bottle', stock: 96, min: 24, cost: 35, supplier: 'Nairobi Bottlers' },
      { name: 'Fanta Orange 300ml Glass', type: 'PACKAGED_UNIT', unit: 'bottle', stock: 96, min: 24, cost: 35, supplier: 'Nairobi Bottlers' },
      { name: 'Coca-Cola 500ml PET', type: 'PACKAGED_UNIT', unit: 'bottle', stock: 80, min: 20, cost: 55, supplier: 'Nairobi Bottlers' },
      { name: 'Dasani Mineral Water 500ml', type: 'PACKAGED_UNIT', unit: 'bottle', stock: 120, min: 30, cost: 25, supplier: 'Nairobi Bottlers' },
      { name: 'Keringet Sparkling Water 1L', type: 'PACKAGED_UNIT', unit: 'bottle', stock: 48, min: 12, cost: 50, supplier: 'Crown Beverages' },
      { name: 'Fresh Passion Fruit', type: 'RAW_INGREDIENT', unit: 'kg', stock: 35, min: 8, cost: 110, supplier: 'Wakulima Market' },
      { name: 'Fresh Mangoes', type: 'RAW_INGREDIENT', unit: 'kg', stock: 30, min: 8, cost: 100, supplier: 'Wakulima Market' },
      { name: 'Gas Cylinder (13kg LPG)', type: 'RAW_INGREDIENT', unit: 'piece', stock: 4, min: 1, cost: 2800, supplier: 'TotalEnergies' },
    ];

    for (const item of items) {
      const created = await prisma.stockItem.create({
        data: {
          branchId: b.id,
          name: item.name,
          type: item.type,
          unit: item.unit,
          currentStock: item.stock,
          minStockAlert: item.min,
          unitCost: item.cost,
          supplierName: item.supplier,
        },
      });
      stockMap[b.id][item.name] = created.id;
    }
  }

  // 5. Create Menu Items, Variants, and Recipes
  console.log('Creating menu items & recipes...');

  // A. Fast Foods & Chips
  const chips = await prisma.menuItem.create({
    data: {
      categoryId: catFastFood.id,
      name: 'Chips',
      description: 'Crispy golden potato chips',
      basePrice: 100,
      costPrice: 45,
      imageUrl: './images/chips.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const chipsMayai = await prisma.menuItem.create({
    data: {
      categoryId: catFastFood.id,
      name: 'Chips Mayai',
      description: 'Crispy chips and eggs bound in double-egg omelette (Zege)',
      basePrice: 180,
      costPrice: 80,
      imageUrl: './images/chips-mayai.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  // B. Kuku & Meat Dishes
  const chicken = await prisma.menuItem.create({
    data: {
      categoryId: catMeat.id,
      name: 'Chicken',
      description: 'Seasoned golden deep-fried or grilled chicken portion',
      basePrice: 250,
      costPrice: 120,
      imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  // C. Swahili Cooked Meals
  const pilau = await prisma.menuItem.create({
    data: {
      categoryId: catRice.id,
      name: 'Pilau',
      description: 'Authentic coastal Swahili spiced fragrant basmati pilau',
      basePrice: 250,
      costPrice: 110,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const biriani = await prisma.menuItem.create({
    data: {
      categoryId: catRice.id,
      name: 'Biriani',
      description: 'Aromatic layered coastal Biriani rice with rich savory sauce',
      basePrice: 350,
      costPrice: 150,
      imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  // D. Snacks & Pasua Sides
  const viaziKarai = await prisma.menuItem.create({
    data: {
      categoryId: catSnacks.id,
      name: 'Viazi Karai',
      description: 'Crispy golden Swahili battered spiced potatoes',
      basePrice: 50,
      costPrice: 20,
      imageUrl: './images/viazi-karai.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const sausages = await prisma.menuItem.create({
    data: {
      categoryId: catSnacks.id,
      name: 'Sausages',
      description: 'Deep-fried Kenyan butcher beef sausages',
      basePrice: 50,
      costPrice: 25,
      imageUrl: 'https://images.unsplash.com/photo-1585325701165-351af916e581?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  // E. Drinks & Juices
  const energyDrink = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Energy Drink',
      description: 'Chilled revitalizing energy drink',
      basePrice: 70,
      costPrice: 45,
      imageUrl: './images/energy-drink.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const freshJuice = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Fresh Juice',
      description: '100% pure freshly squeezed and blended tropical juice',
      basePrice: 70,
      costPrice: 35,
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const cocaCola = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Coca-Cola',
      description: 'Chilled classic Coca-Cola soda',
      basePrice: 70,
      costPrice: 40,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const fanta = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Fanta',
      description: 'Chilled vibrant orange Fanta soda',
      basePrice: 70,
      costPrice: 40,
      imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const sprite = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Sprite',
      description: 'Chilled crisp lemon-lime Sprite soda',
      basePrice: 70,
      costPrice: 40,
      imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const stoney = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Stoney',
      description: 'Chilled fiery Stoney Tangawizi ginger soda',
      basePrice: 70,
      costPrice: 40,
      imageUrl: './images/stoney.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const krest = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Krest',
      description: 'Chilled sparkling Krest Bitter Lemon soda',
      basePrice: 70,
      costPrice: 40,
      imageUrl: './images/krest.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const waterSmall = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Water (Small)',
      description: 'Chilled pure mineral water (500ml small bottle)',
      basePrice: 30,
      costPrice: 15,
      imageUrl: './images/water-small.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  const waterBig = await prisma.menuItem.create({
    data: {
      categoryId: catDrinks.id,
      name: 'Water (Big)',
      description: 'Chilled pure mineral water (1L big bottle)',
      basePrice: 50,
      costPrice: 25,
      imageUrl: './images/water-big.jpg',
      isAvailable: true,
      hasVariants: false,
    },
  });

  // 6. Link Recipe Bill of Materials (using Migadini branch stock IDs as template)
  console.log('Linking recipe bill of materials...');
  const migadiniStock = stockMap[migadini.id];

  await prisma.menuItemRecipe.create({
    data: { menuItemId: chips.id, stockItemId: migadiniStock['Potatoes (Shangi)'], quantityRequired: 0.35 },
  });
  await prisma.menuItemRecipe.create({
    data: { menuItemId: chips.id, stockItemId: migadiniStock['Cooking Oil (Rina/Elianto)'], quantityRequired: 0.05 },
  });
  await prisma.menuItemRecipe.create({
    data: { menuItemId: chicken.id, stockItemId: migadiniStock['Raw Chicken (Whole/Cut)'], quantityRequired: 0.30 },
  });
  await prisma.menuItemRecipe.create({
    data: { menuItemId: pilau.id, stockItemId: migadiniStock['Basmati Rice (Grade 1)'], quantityRequired: 0.20 },
  });
  await prisma.menuItemRecipe.create({
    data: { menuItemId: biriani.id, stockItemId: migadiniStock['Basmati Rice (Grade 1)'], quantityRequired: 0.25 },
  });

  // 7. Create Active Shift for Migadini
  console.log('Creating initial shifts and expenses...');
  const openShift = await prisma.shift.create({
    data: {
      branchId: migadini.id,
      cashierId: cashier1.id,
      openingFloat: 3000,
      status: 'OPEN',
      openedAt: new Date(new Date().setHours(8, 0, 0, 0)),
      notes: 'Morning shift opening float verified by Manager',
    },
  });

  // 8. Create Sample Daily Expenses for today
  await prisma.expense.create({
    data: {
      branchId: migadini.id,
      shiftId: openShift.id,
      category: 'MARKET_PRODUCE',
      amount: 1400,
      description: 'Morning fresh tomatoes, coriander & red onions from market',
      paidTo: 'Veggies Supplier',
      paymentSource: 'CASH_DRAWER',
      receiptNumber: 'WAK-904',
    },
  });

  await prisma.expense.create({
    data: {
      branchId: migadini.id,
      category: 'GAS_CHARCOAL',
      amount: 2800,
      description: 'TotalEnergies 13kg Gas cylinder refill for main fryers',
      paidTo: 'Gas Station',
      paymentSource: 'BANK_MPESA',
      receiptNumber: 'TOT-4821',
    },
  });

  await prisma.expense.create({
    data: {
      branchId: branch2.id,
      category: 'TRANSPORT_BODA',
      amount: 350,
      description: 'Boda boda delivery of fresh chicken crate from supplier depot',
      paidTo: 'Rider',
      paymentSource: 'CASH_DRAWER',
    },
  });

  // 9. Create Sample Completed Orders with M-Pesa (Pochi) and Cash payments across branches
  console.log('Generating realistic demo orders...');

  // Order 1: Migadini - Dine-in Pilau & Coca-Cola (M-Pesa Pochi)
  const ord1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20260822-1001',
      branchId: migadini.id,
      cashierId: cashier1.id,
      shiftId: openShift.id,
      orderType: 'DINE_IN',
      tableNumber: 'T-04',
      customerName: 'Customer',
      customerPhone: '0143285625',
      status: 'COMPLETED',
      subtotal: 320,
      discountAmount: 0,
      totalAmount: 320,
      items: {
        create: [
          {
            menuItemId: pilau.id,
            itemName: 'Pilau',
            quantity: 1,
            unitPrice: 250,
            unitCost: 110,
            totalPrice: 250,
          },
          {
            menuItemId: cocaCola.id,
            itemName: 'Coca-Cola',
            quantity: 1,
            unitPrice: 70,
            unitCost: 40,
            totalPrice: 70,
          },
        ],
      },
      payments: {
        create: [
          {
            branchId: migadini.id,
            amount: 320,
            paymentMethod: 'MPESA',
            mpesaCode: 'QHK8921XLA',
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  // Order 2: Migadini - Takeaway Chips & Chicken + Fresh Juice (Split Payment: Cash + M-Pesa)
  const ord2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20260822-1002',
      branchId: migadini.id,
      cashierId: cashier2.id,
      shiftId: openShift.id,
      orderType: 'TAKEAWAY',
      customerName: 'Customer',
      status: 'COMPLETED',
      subtotal: 420,
      discountAmount: 0,
      totalAmount: 420,
      items: {
        create: [
          {
            menuItemId: chips.id,
            itemName: 'Chips',
            quantity: 1,
            unitPrice: 100,
            unitCost: 45,
            totalPrice: 100,
          },
          {
            menuItemId: chicken.id,
            itemName: 'Chicken',
            quantity: 1,
            unitPrice: 250,
            unitCost: 120,
            totalPrice: 250,
          },
          {
            menuItemId: freshJuice.id,
            itemName: 'Fresh Juice',
            quantity: 1,
            unitPrice: 70,
            unitCost: 35,
            totalPrice: 70,
          },
        ],
      },
      payments: {
        create: [
          {
            branchId: migadini.id,
            amount: 220,
            paymentMethod: 'MPESA',
            mpesaCode: 'QHK9942MPB',
            status: 'COMPLETED',
          },
          {
            branchId: migadini.id,
            amount: 200,
            paymentMethod: 'CASH',
            cashTendered: 500,
            changeAmount: 300,
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  // Order 3: Branch 2 - Biriani & Sprite (Cash)
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-20260822-2001',
      branchId: branch2.id,
      cashierId: cashier3.id,
      orderType: 'DINE_IN',
      tableNumber: 'T-12',
      customerName: 'Customer',
      status: 'COMPLETED',
      subtotal: 420,
      discountAmount: 0,
      totalAmount: 420,
      items: {
        create: [
          {
            menuItemId: biriani.id,
            itemName: 'Biriani',
            quantity: 1,
            unitPrice: 350,
            unitCost: 150,
            totalPrice: 350,
          },
          {
            menuItemId: sprite.id,
            itemName: 'Sprite',
            quantity: 1,
            unitPrice: 70,
            unitCost: 40,
            totalPrice: 70,
          },
        ],
      },
      payments: {
        create: [
          {
            branchId: branch2.id,
            amount: 420,
            paymentMethod: 'CASH',
            cashTendered: 500,
            changeAmount: 80,
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  // Order 4: Migadini - Chips Mayai + Sausages + Energy Drink (M-Pesa)
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-20260822-3001',
      branchId: migadini.id,
      cashierId: cashier4.id,
      orderType: 'TAKEAWAY',
      customerName: 'Customer',
      status: 'COMPLETED',
      subtotal: 300,
      discountAmount: 0,
      totalAmount: 300,
      items: {
        create: [
          {
            menuItemId: chipsMayai.id,
            itemName: 'Chips Mayai',
            quantity: 1,
            unitPrice: 180,
            unitCost: 80,
            totalPrice: 180,
          },
          {
            menuItemId: sausages.id,
            itemName: 'Sausages',
            quantity: 1,
            unitPrice: 50,
            unitCost: 25,
            totalPrice: 50,
          },
          {
            menuItemId: energyDrink.id,
            itemName: 'Energy Drink',
            quantity: 1,
            unitPrice: 70,
            unitCost: 45,
            totalPrice: 70,
          },
        ],
      },
      payments: {
        create: [
          {
            branchId: migadini.id,
            amount: 300,
            paymentMethod: 'MPESA',
            mpesaCode: 'QHL0014KLM',
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  // Update open shift stats
  await prisma.shift.update({
    where: { id: openShift.id },
    data: {
      totalCashSales: 200,
      totalMpesaSales: 780,
    },
  });

  console.log('✅ Database seeded successfully with realistic Kenyan restaurant data!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
