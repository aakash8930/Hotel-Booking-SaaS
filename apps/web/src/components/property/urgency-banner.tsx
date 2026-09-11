'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap } from 'lucide-react'; // I'll use simple emoji if lucide is not available

interface UrgencyBannerProps {
  propertyId: string;
}

export function UrgencyBanner({ propertyId }: UrgencyBannerProps) {
  const [viewers, setViewers] = useState(12);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    const socket = new WebSocket(`${wsUrl}/ws`);

    socket.onopen = () => {
      // Subscribe to this property's events
      socket.send(JSON.stringify({
        action: 'subscribe',
        propertyId: propertyId,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'BOOKING_CREATED' || data.type === 'AVAILABILITY_CHANGED') {
          setToast('Someone just booked a room here!');
          setTimeout(() => setToast(null), 5000);
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    };

    // Simulate viewing count fluctuation for premium feel
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        return Math.max(5, Math.min(42, prev + change));
      });
    }, 8000);

    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, [propertyId]);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 pointer-events-none">
      {/* Viewer Count Banner */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white/90 backdrop-blur-md border border-surface-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm text-surface-800"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
        </span>
        <span className="font-medium">{viewers} people are viewing this stay right now</span>
      </motion.div>

      {/* Just Booked Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-brand-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium"
          >
            <span className="text-lg">⚡</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
