import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, AuthenticatedRequest, requireManagerOrOwner } from '../middleware/auth.js';

const router = Router();

// Get recipe items for all or specific menu item
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { menuItemId } = req.query;
    const where = menuItemId ? { menuItemId: menuItemId as string } : {};

    const recipes = await prisma.menuItemRecipe.findMany({
      where: { ...where, ...(req.branchScopeId ? { stockItem: { branchId: req.branchScopeId } } : {}) },
      include: {
        menuItem: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
        stockItem: { select: { id: true, name: true, unit: true, currentStock: true, unitCost: true } },
      },
    });

    res.json(recipes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update recipe requirement
router.post('/', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { menuItemId, variantId, stockItemId, quantityRequired } = req.body;

    if (!menuItemId || !stockItemId || quantityRequired === undefined || parseFloat(quantityRequired) <= 0) {
      res.status(400).json({ error: 'Menu item, stock item, and valid quantity required are required' });
      return;
    }

    const recipe = await prisma.menuItemRecipe.create({
      data: {
        menuItemId,
        variantId: variantId || null,
        stockItemId,
        quantityRequired: parseFloat(quantityRequired),
      },
      include: {
        menuItem: true,
        variant: true,
        stockItem: true,
      },
    });

    res.status(201).json(recipe);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe requirement
router.delete('/:id', authenticateToken, requireManagerOrOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.menuItemRecipe.delete({ where: { id } });
    res.json({ message: 'Recipe mapping removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
