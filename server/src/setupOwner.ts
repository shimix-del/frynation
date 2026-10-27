import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

async function secret(label: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Run owner setup in an interactive terminal');
  process.stdout.write(label);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => { process.stdin.setRawMode(false); process.stdin.off('data', listener); process.stdout.write('\n'); };
    const listener = (data: Buffer) => {
      for (const char of data.toString()) {
        if (char === '\u0003') { finish(); reject(new Error('Setup cancelled')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', listener);
  });
}

async function main() {
  if (await prisma.user.count()) throw new Error('Owner setup is only available for an empty user table');
  const input = createInterface({ input: process.stdin, output: process.stdout });
  const name = (await input.question('Owner name: ')).trim();
  const email = (await input.question('Owner email: ')).trim().toLowerCase();
  input.close();
  const pin = await secret('Choose four-digit PIN (hidden): ');
  const confirmation = await secret('Confirm PIN (hidden): ');
  const password = await secret('Choose password, at least 12 characters (hidden): ');
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{4}$/.test(pin) || pin !== confirmation || password.length < 12) throw new Error('Invalid details or PIN confirmation');
  await prisma.$transaction(async tx => {
    if (await tx.user.count()) throw new Error('A user already exists; owner setup stopped');
    const user = await tx.user.create({ data: { name, email, role: 'OWNER', pinCode: await bcrypt.hash(pin, 10), passwordHash: await bcrypt.hash(password, 10) } });
    await tx.activityLog.create({ data: { actorId: user.id, actorName: name, actorRole: 'OWNER', action: 'OWNER_INITIALIZED', entityType: 'USER', entityId: user.id } });
  }, { isolationLevel: 'Serializable' });
  console.log('Owner created. Sign in to add branches and staff.');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); process.stdin.pause(); });
