import { terminalId } from '../security.js';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../middleware/auth.js';
export async function logActivity(tx: Prisma.TransactionClient, user: AuthUser, action: string, entityType: string, entityId: string | null, branchId: string | null, shiftId: string | null, details: Prisma.InputJsonValue = {}) {
    if (!shiftId && branchId)
        shiftId = (await tx.shift.findFirst({ where: { branchId, status: 'OPEN', terminalId } }))?.id || null;
    await tx.activityLog.create({ data: { actorId: user.id, actorName: user.name, actorRole: user.role,
            action, entityType, entityId, branchId, shiftId, details } });
}
