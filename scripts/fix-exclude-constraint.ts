#!/usr/bin/env tsx
/**
 * Apply the EXCLUDE constraint to the bookings table
 * This constraint prevents double-bookings at the database level
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
    // First, enable the btree_gist extension (required for EXCLUDE constraints)
    console.log('1. Enabling btree_gist extension...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS btree_gist');
    console.log('   ✅ Extension enabled\n');

    // Drop the constraint if it exists (to make this idempotent)
    console.log('2. Removing existing constraint (if any)...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Booking" 
        DROP CONSTRAINT IF EXISTS "Booking_roomId_dateRange_exclusion"
      `);
      console.log('   ✅ Old constraint removed\n');
    } catch (e) {
      console.log('   ℹ️  No existing constraint found\n');
    }

    // Add the EXCLUDE constraint
    console.log('3. Adding EXCLUDE constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_roomId_dateRange_exclusion"
      EXCLUDE USING gist (
        "roomId" WITH =,
        daterange("checkIn", "checkOut") WITH &&
      ) WHERE (status IN ('PENDING', 'CONFIRMED', 'PAID'))
    `);
    console.log('   ✅ EXCLUDE constraint added successfully!\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Database is now protected against double-bookings!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('The constraint prevents overlapping bookings where:');
    console.log('  • Same room (roomId = roomId)');
    console.log('  • Overlapping date ranges (checkIn/checkOut overlap)');
    console.log('  • Active status (PENDING, CONFIRMED, or PAID)\n');

    console.log('Run the test again to verify:');
    console.log('  pnpm test:exclude\n');

  } catch (error) {
    console.error('❌ Failed to apply EXCLUDE constraint:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
