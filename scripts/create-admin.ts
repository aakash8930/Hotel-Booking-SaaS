#!/usr/bin/env tsx
/**
 * Create (or update the password of) an admin account.
 *
 * There is deliberately no HTTP endpoint for this — admin accounts are
 * created only by whoever controls the deploy environment, running this
 * script directly. See the Admin model's schema comment.
 *
 * Usage:
 *   pnpm create:admin -- --email admin@example.com --name "Ops" --password "Str0ngPass!"
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';

config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../packages/prisma/.env') });

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const email = getArg('email')?.toLowerCase();
  const name = getArg('name');
  const password = getArg('password');

  if (!email || !name || !password) {
    console.error('Usage: pnpm create:admin -- --email <email> --name <name> --password <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, name, passwordHash },
  });

  console.log(`✅ Admin account ready: ${admin.email} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error('❌ Failed to create admin:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
