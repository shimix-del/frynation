import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireManagerOrOwner } from '../middleware/auth.js';

const router = Router();

// List all menu items with category & variants
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, search, includeInactive } = req.query;

    const where: any = {};
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId as string;
    }
    if (search) {
      where.name = { contains: search as string };
    }
    if (includeInactive !== 'true') {
      where.isAvailable = true;
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        variants: {
          orderBy: { price: 'asc' },
        },
        recipes: {
          where: req.branchScopeId ? { stockItem: { branchId: req.branchScopeId } } : {},
          include: {
            stockItem: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' },
      ],
    });

    res.json(menuItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single menu item
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        recipes: {
          where: req.branchScopeId ? { stockItem: { branchId: req.branchScopeId } } : {},
          include: {
            stockItem: true,
          },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quick toggle stock/availability (accessible by cashiers or managers)
router.patch('/:id/toggle-stock', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const current = await prisma.menuItem.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !current.isAvailable },
      include: { category: true, variants: true },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create menu item with variants
router.post('/', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      categoryId,
      name,
      description,
      basePrice,
      costPrice,
      imageUrl,
      hasVariants,
      variants,
    } = req.body;

    if (!categoryId || !name || basePrice === undefined) {
      res.status(400).json({ error: 'Category, name, and base price are required' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        categoryId,
        name,
        description: description || null,
        basePrice: parseFloat(basePrice),
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        imageUrl: imageUrl || null,
        hasVariants: Boolean(hasVariants),
        variants: variants && variants.length > 0
          ? {
              create: variants.map((v: any) => ({
                name: v.name,
                price: parseFloat(v.price),
                costPrice: v.costPrice ? parseFloat(v.costPrice) : 0,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item
router.put('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      categoryId,
      name,
      description,
      basePrice,
      costPrice,
      imageUrl,
      isAvailable,
      hasVariants,
      variants,
    } = req.body;

    if (variants && Array.isArray(variants)) {
      const retainedIds: string[] = [];
      for (const v of variants) {
        if (v.id) {
          const previous = await prisma.menuItemVariant.findFirst({ where: { id: v.id, menuItemId: id } });
          if (!previous) { res.status(400).json({ error: 'Variant does not belong to this item' }); return; }
          retainedIds.push(v.id);
          await prisma.menuItemVariant.update({ where: { id: v.id }, data: { name: v.name, price: Number(v.price), costPrice: Number(v.costPrice || 0), isAvailable: v.isAvailable !== false } });
        } else { const created = await prisma.menuItemVariant.create({ data: { menuItemId: id, name: v.name, price: Number(v.price), costPrice: Number(v.costPrice || 0) } }); retainedIds.push(created.id); }
      }
      await prisma.menuItemVariant.updateMany({ where: { menuItemId: id, id: { notIn: retainedIds } }, data: { isAvailable: false } });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        categoryId: categoryId !== undefined ? categoryId : undefined,
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        basePrice: basePrice !== undefined ? parseFloat(basePrice) : undefined,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined,
        hasVariants: hasVariants !== undefined ? Boolean(hasVariants) : undefined,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete or archive menu item
router.delete('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const orderItemsCount = await prisma.orderItem.count({ where: { menuItemId: id } });
    if (orderItemsCount > 0) {
      await prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
      res.json({ message: 'Menu item archived and hidden from POS' });
      return;
    }
    await prisma.menuItemRecipe.deleteMany({ where: { menuItemId: id } });
    await prisma.menuItemVariant.deleteMany({ where: { menuItemId: id } });
    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
