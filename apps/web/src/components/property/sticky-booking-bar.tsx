'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Room } from '@hbs/shared';

interface StickyBookingBarProps {
  room: Room;
  propertyId: string;
}

export function StickyBookingBar({ room, propertyId }: StickyBookingBarProps) {
  const router = useRouter();

  const handleBook = () => {
    router.push(
      `/booking/${room.id}?propertyId=${propertyId}&checkIn=${new Date().toISOString().split('T')[0]}&checkOut=${new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}`,
    );
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-6 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 p-4 bg-surface-900/90 backdrop-blur-xl border border-surface-700 rounded-2xl shadow-2xl pointer-events-auto">
        <div className="hidden sm:block">
          <p className="text-xs text-surface-400 uppercase tracking-widest mb-1">Best available rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">₹{room.basePrice.toLocaleString('en-IN')}</span>
            <span className="text-sm text-surface-500">/ night</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-white">{room.name}</p>
            <p className="text-xs text-surface-400">Immediate confirmation</p>
          </div>
          <Button
            onClick={handleBook}
            className="flex-1 sm:flex-none px-8 py-6 rounded-xl text-lg font-semibold transition-transform active:scale-95"
          >
            Book Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
