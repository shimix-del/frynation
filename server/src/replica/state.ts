import prisma from '../prisma.js';
export async function initializeReplica() {
  if (process.env.SITE_MODE !== 'cloud') await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS NaniReplicaState (`id` VARCHAR(191) NOT NULL PRIMARY KEY, `body` LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
  await prisma.$executeRaw`INSERT IGNORE INTO NaniReplicaState (id,body) VALUES ('receiver-lock','{}')`;
}
export async function readState(id: string, db: any = prisma): Promise<any> {
  const rows = await db.$queryRaw`SELECT body FROM NaniReplicaState WHERE id=${id}`;
  return rows.length ? JSON.parse(rows[0].body) : null;
}
export async function writeState(id: string, body: any, db: any = prisma) {
  const json = JSON.stringify(body);
  await db.$executeRaw`INSERT INTO NaniReplicaState (id,body) VALUES (${id},${json}) ON DUPLICATE KEY UPDATE body=VALUES(body)`;
}

export async function deleteState(id: string, db: any = prisma) {
  await db.$executeRaw`DELETE FROM NaniReplicaState WHERE id=${id}`;
}
