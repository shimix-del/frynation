import { Router, Response } from 'express';
import prisma from '../prisma.js';
import { authenticateToken, requireOwner, AuthenticatedRequest } from '../middleware/auth.js';
const router = Router();
router.get('/', authenticateToken, requireOwner, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { branchId, shiftId, actorId, action, from, to, cursor } = req.query;
        const date: any = {};
        if (from)
            date.gte = new Date(String(from));
        if (to)
            date.lte = new Date(String(to));
        if (Object.values(date).some((d: any) => isNaN(d.getTime()))) {
            res.status(400).json({ error: 'Invalid date filter' });
            return;
        }
        const rows = await prisma.activityLog.findMany({ where: {
                ...(branchId && branchId !== 'all' ? { branchId: String(branchId) } : {}),
                ...(shiftId ? { shiftId: String(shiftId) } : {}), ...(actorId ? { actorId: String(actorId) } : {}),
                ...(action ? { action: String(action) } : {}), ...(from || to ? { createdAt: date } : {}),
            }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 101,
            ...(cursor ? { cursor: { id: String(cursor) }, skip: 1 } : {}) });
        res.json({ entries: rows.slice(0, 100), nextCursor: rows.length > 100 ? rows[99].id : null });
    }
    catch {
        res.status(500).json({ error: 'Could not load activity log' });
    }
});
export default router;
