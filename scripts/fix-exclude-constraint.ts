#!/usr/bin/env tsx
/**
 * Apply the EXCLUDE constraint to the bookings table.
 * This constraint prevents double-bookings at the database level.
 *
 * Prisma's `db:push` doesn't execute raw SQL migrations, so we apply
 * the EXCLUDE constraint manually here.
 *
 * Table/column names use the SQL names from @@map and @map directives:
 *   Model: Booking   → Table: bookings
 *   Field: roomId    → Column: room_id
 *   Field: checkIn   → Column: check_in
 *   Field: checkOut  → Column: check_out
 *   Field: status    → Column: status
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../packages/prisma/.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Applying EXCLUDE constraint to prevent double-bookings...\n');

  try {
    // 1. Enable the btree_gist extension (required for EXCLUDE constraints)
    console.log('1. Enabling btree_gist extension...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS btree_gist');
    console.log('   ✅ Extension enabled\n');

    // 2. Drop existing constraint if any (idempotent)
    console.log('2. Removing existing constraint (if any)...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "bookings"
      DROP CONSTRAINT IF EXISTS "no_overlapping_bookings"
    `);
    console.log('   ✅ Done\n');

    // 3. Clean up any existing overlapping bookings before adding constraint
    //    (otherwise the constraint creation will fail on existing data)
    console.log('3. Checking for existing overlapping bookings...');
    const overlaps = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "bookings" b1
      JOIN "bookings" b2 ON b1.room_id = b2.room_id
        AND b1.id < b2.id
        AND b1.check_in < b2.check_out
        AND b1.check_out > b2.check_in
        AND b1.status IN ('PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN')
        AND b2.status IN ('PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN')
    `) as any;
    console.log(`   Found ${overlaps[0]?.count ?? 0} overlapping pairs\n`);

    // 4. Add the EXCLUDE constraint
    console.log('4. Adding EXCLUDE constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "bookings"
      ADD CONSTRAINT "no_overlapping_bookings"
      EXCLUDE USING gist (
        "room_id" WITH =,
        daterange("check_in", "check_out") WITH &&
      ) WHERE (status IN ('PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'))
    `);
    console.log('   ✅ EXCLUDE constraint added successfully!\n');

    // 5. Verify it exists
    console.log('5. Verifying constraint...');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'no_overlapping_bookings'
    `);
    if ((constraints as any[]).length > 0) {
      console.log('   ✅ Constraint verified in database!\n');
    } else {
      console.log('   ❌ Constraint not found!\n');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Database is now protected against double-bookings!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('The constraint prevents overlapping bookings where:');
    console.log('  • Same room (room_id = room_id)');
    console.log('  • Overlapping date ranges (check_in/check_out overlap)');
    console.log('  • Active status (PENDING, CONFIRMED, PAID, or CHECKED_IN)\n');
    console.log('Run the test to verify:');
    console.log('  pnpm test:exclude\n');

  } catch (error: any) {
    console.error('❌ Failed to apply EXCLUDE constraint:');
    console.error(`   ${error.message}\n`);

    if (error.message?.includes('could not create exclusion constraint')) {
      console.log('   💡 This usually means there are existing overlapping bookings.');
      console.log('      Reset the database and try again:');
      console.log('      pnpm db:push --force-reset && pnpm fix:constraint\n');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
