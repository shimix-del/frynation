import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';
export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0;; attempt++) {
        try {
            return await prisma.$transaction(work, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 20000 });
        }
        catch (err: any) {
            if (err.code !== 'P2034' || attempt >= 2)
                throw err;
        }
    }
}
export async function lockBranch(tx: Prisma.TransactionClient, branchId: string) {
    const branch = await tx.branch.update({ where: { id: branchId }, data: { updatedAt: new Date() } });
    if (!branch.isActive)
        throw new Error('This branch is inactive');
}
