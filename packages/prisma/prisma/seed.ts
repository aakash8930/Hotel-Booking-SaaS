import 'dotenv/config';
import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo host
  const host = await prisma.host.upsert({
    where: { email: 'demo@homestay.example' },
    update: {},
    create: {
      email: 'demo@homestay.example',
      passwordHash: '$2b$12$placeholder_hash_replace_in_production',
      name: 'Ananya Sharma',
      phone: '+919876543210',
      businessName: 'Mountain View Homestay',
    },
  });

  console.log(`  ✅ Host: ${host.name} (${host.id})`);

  // Create a property
  const property = await prisma.property.upsert({
    where: { slug: 'mountain-view-homestay-manali' },
    update: {},
    create: {
      hostId: host.id,
      name: 'Mountain View Homestay',
      slug: 'mountain-view-homestay-manali',
      description:
        'A cozy homestay nestled in the Himalayan foothills with stunning mountain views, home-cooked meals, and warm hospitality.',
      address: 'Village Dhungri, Near Hadimba Temple',
      city: 'Manali',
      state: 'Himachal Pradesh',
      pincode: '175131',
      latitude: 32.2432,
      longitude: 77.1892,
      status: 'ACTIVE',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      rules: JSON.stringify({
        smoking: false,
        pets: false,
        parties: false,
        quietHours: '22:00-07:00',
      }),
    },
  });

  console.log(`  ✅ Property: ${property.name} (${property.id})`);

  // Create rooms
  const rooms = await Promise.all([
    prisma.room.upsert({
      where: { id: 'placeholder-will-create' },
      update: {},
      create: {
        propertyId: property.id,
        name: 'Deluxe Mountain Room',
        description:
          'Spacious room with a private balcony offering panoramic views of the snow-capped Himalayas.',
        capacity: 2,
        basePrice: 3500,
        amenities: ['wifi', 'hot-water', 'heater', 'balcony', 'mountain-view'],
        images: [],
        sortOrder: 1,
      },
    }).catch(async () => {
      return prisma.room.create({
        data: {
          propertyId: property.id,
          name: 'Deluxe Mountain Room',
          description: 'Spacious room with a private balcony offering panoramic views of the snow-capped Himalayas.',
          capacity: 2,
          basePrice: 3500,
          amenities: ['wifi', 'hot-water', 'heater', 'balcony', 'mountain-view'],
          images: [],
          sortOrder: 1,
        },
      });
    }),
    prisma.room.create({
      data: {
        propertyId: property.id,
        name: 'Cozy Single Room',
        description: 'Perfect for solo travelers — warm, compact, and comfortable with all essentials.',
        capacity: 1,
        basePrice: 2000,
        amenities: ['wifi', 'hot-water', 'heater'],
        images: [],
        sortOrder: 2,
      },
    }),
    prisma.room.create({
      data: {
        propertyId: property.id,
        name: 'Family Suite',
        description: 'Large room for families with a separate sitting area and extra bedding.',
        capacity: 4,
        basePrice: 5500,
        amenities: ['wifi', 'hot-water', 'heater', 'balcony', 'mountain-view', 'extra-bed'],
        images: [],
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`  ✅ Rooms: ${rooms.map((r) => r.name).join(', ')}`);

  // Create a demo guest
  const guest = await prisma.guest.upsert({
    where: { email: 'guest@example.com' },
    update: {},
    create: {
      email: 'guest@example.com',
      name: 'Rahul Verma',
      phone: '+919988776655',
    },
  });

  console.log(`  ✅ Guest: ${guest.name} (${guest.id})`);

  // Create a confirmed booking (demonstrates the EXCLUDE constraint is working)
  const booking = await prisma.booking.create({
    data: {
      roomId: rooms[0]!.id,
      guestId: guest.id,
      checkIn: new Date('2026-10-15'),
      checkOut: new Date('2026-10-18'),
      guests: 2,
      status: BookingStatus.CONFIRMED,
      totalPrice: 10500,
    },
  });

  console.log(`  ✅ Booking: ${booking.id} (${booking.status})`);

  // Test the EXCLUDE constraint — this should FAIL
  console.log('\n🧪 Testing EXCLUDE constraint (expecting failure)...');
  try {
    await prisma.booking.create({
      data: {
        roomId: rooms[0]!.id,
        guestId: guest.id,
        checkIn: new Date('2026-10-16'), // Overlaps with existing booking
        checkOut: new Date('2026-10-19'),
        guests: 1,
        status: BookingStatus.PENDING,
        totalPrice: 10500,
      },
    });
    console.log('  ❌ UNEXPECTED: Overlapping booking was created! Constraint not working.');
  } catch (error) {
    console.log('  ✅ Overlapping booking correctly rejected by database!');
    console.log(`     Error: ${(error as Error).message.split('\n')[0]}`);
  }

  // But a non-overlapping booking should succeed
  const booking2 = await prisma.booking.create({
    data: {
      roomId: rooms[0]!.id,
      guestId: guest.id,
      checkIn: new Date('2026-10-18'), // Starts exactly when first one ends — no overlap
      checkOut: new Date('2026-10-20'),
      guests: 2,
      status: BookingStatus.PENDING,
      totalPrice: 7000,
      holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min hold
    },
  });

  console.log(`  ✅ Non-overlapping booking created: ${booking2.id}`);

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
