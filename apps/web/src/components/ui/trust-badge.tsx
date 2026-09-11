'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';

interface TrustBadgeProps {
  type: 'HOST' | 'GUEST';
  status: string;
  name?: string;
}

export function TrustBadge({ type, status, name }: TrustBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isVerified = status === 'VERIFIED';

  const config = {
    HOST: {
      label: 'Verified Host',
      color: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40',
      desc: 'This host has undergone a full identity and property verification process to ensure a safe and genuine stay.',
    },
    GUEST: {
      label: 'Verified Guest',
      color: 'bg-blue-500/20 text-blue-100 border-blue-400/40',
      desc: 'This guest has a verified identity and a history of positive stays across the platform.',
    },
  };

  if (!isVerified) return null;

  const { label, color, desc } = config[type];

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur border text-sm transition-all cursor-help ${color}`}>
        <CheckCircle2 className="w-3 h-3" />
        {label}
      </span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-surface-900 text-white text-xs rounded-xl shadow-2xl z-50 border border-surface-700"
          >
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-brand-400 shrink-0" />
              <p className="leading-relaxed text-surface-300">
                {desc}
              </p>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-900 border-r border-b border-surface-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
