'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAvailability } from '@/lib/use-availability';
import { FaqChat } from '@/components/property/faq-chat';
import { ReviewsSection } from '@/components/property/reviews-section';
import { StarRating } from '@/components/property/star-rating';
import { PropertyMap } from '@/components/property/property-map';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CANCELLATION_POLICY_LABELS, CANCELLATION_POLICY_DESCRIPTIONS } from '@/lib/cancellation-policy';
import type { Property, Room } from '@hbs/shared';

type PropertyWithRooms = Property & {
  rooms: Room[];
  host: { id: string; name: string; businessName: string | null; verificationStatus: string };
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [property, setProperty] = useState<PropertyWithRooms | null>(null);
  const [loading, setLoading] = useState(true);
  const justHeldRoomIds = useAvailability(property?.id);

  useEffect(() => {
    loadProperty();
  }, [slug]);

  async function loadProperty() {
    const res = await api.get<PropertyWithRooms>(`/properties/${slug}`);
    if (res.success && res.data) {
      setProperty(res.data);
    }
    setLoading(false);
  }

  function handleBookRoom(room: Room) {
    router.push(
      `/booking/${room.id}?propertyId=${property?.id}&checkIn=${new Date().toISOString().split('T')[0]}&checkOut=${new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}`,
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-surface-900 mb-3">
            Property not found
          </h1>
          <p className="text-surface-500 mb-6">
            This listing may have been removed or the link is incorrect.
          </p>
          <Button onClick={() => router.push('/')}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero banner — no real photography available, so a branded gradient
          stands in where a cover photo would normally go. */}
      <div className="relative h-[42vh] md:h-[52vh] min-h-[320px] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-24 left-6 z-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-100/80 backdrop-blur border border-surface-300/40 text-sm font-medium text-surface-800 hover:bg-surface-200/80 transition-colors"
        >
          ← Back to search
        </button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-x-0 bottom-0 container-custom pb-8"
        >
          <p className="text-brand-100 text-sm tracking-[0.15em] uppercase mb-2">
            {property.city}, {property.state}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-white text-balance">
              {property.name}
            </h1>
            {property.averageRating && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-950/20 backdrop-blur border border-white/20 text-sm text-white">
                <StarRating rating={property.averageRating} size="sm" />
                {property.averageRating} ({property.reviewCount})
              </span>
            )}
            {property.host.verificationStatus === 'VERIFIED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur border border-emerald-400/40 text-sm text-emerald-100">
                ✓ Verified host
              </span>
            )}
          </div>
        </motion.div>
      </div>

      <div className="container-custom py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-surface-700 leading-relaxed mb-10"
            >
              {property.description}
            </motion.p>

            <div className="grid grid-cols-2 gap-6 mb-12 max-w-sm">
              <div className="card p-5">
                <h3 className="text-sm font-medium text-surface-500 mb-1">Check-in</h3>
                <p className="text-xl font-semibold text-surface-900">{property.checkInTime}</p>
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-medium text-surface-500 mb-1">Check-out</h3>
                <p className="text-xl font-semibold text-surface-900">{property.checkOutTime}</p>
              </div>
            </div>

            <h2 className="font-display text-2xl md:text-3xl font-bold text-surface-900 mb-6">
              Available rooms
            </h2>

            <motion.div
              className="grid gap-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {property.rooms.map((room) => {
                const justHeld = justHeldRoomIds.has(room.id);
                return (
                  <motion.div key={room.id} variants={itemVariants} className="card p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold text-surface-900">{room.name}</h3>
                          <AnimatePresence>
                            {justHeld && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                              >
                                <Badge tone="warning">Just booked</Badge>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        <p className="text-surface-600 text-sm mb-3">{room.description}</p>
                        <div className="flex gap-4 text-sm text-surface-500 mb-3">
                          <span>Capacity: {room.capacity} guests</span>
                        </div>
                        {room.amenities.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {room.amenities.map((amenity) => (
                              <span
                                key={amenity}
                                className="px-3 py-1 bg-surface-100 rounded-full text-xs text-surface-600"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right sm:ml-6 flex sm:flex-col justify-between sm:justify-start items-end sm:items-end">
                        <div>
                          <p className="text-3xl font-bold text-brand-400">
                            ₹{room.basePrice.toLocaleString('en-IN')}
                          </p>
                          <p className="text-surface-500 text-sm mb-3">per night</p>
                        </div>
                        <Button onClick={() => handleBookRoom(room)} disabled={justHeld}>
                          {justHeld ? 'Unavailable' : 'Book now'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="mt-16">
              <Suspense fallback={null}>
                <ReviewsSection propertyId={property.id} />
              </Suspense>
            </div>
          </div>

          {/* Sticky summary sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="card p-6">
                <h3 className="font-semibold text-surface-900 mb-4">About this stay</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-surface-500">Rooms available</dt>
                    <dd className="font-medium text-surface-900">{property.rooms.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-surface-500">From</dt>
                    <dd className="font-medium text-surface-900">
                      ₹
                      {Math.min(...property.rooms.map((r) => r.basePrice)).toLocaleString('en-IN')}
                      /night
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-surface-900 mb-2">
                  Cancellation policy · {CANCELLATION_POLICY_LABELS[property.cancellationPolicy]}
                </h3>
                <p className="text-surface-500 text-sm">
                  {CANCELLATION_POLICY_DESCRIPTIONS[property.cancellationPolicy]}
                </p>
              </div>

              <PropertyMap latitude={property.latitude} longitude={property.longitude} />

              <FaqChat propertyId={property.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
