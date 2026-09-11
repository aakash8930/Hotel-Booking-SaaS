'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react'; // Assuming lucide-react is available, if not I'll use a simple X
import { Button } from '@/components/ui/button';

interface PropertyGalleryProps {
  images: string[];
}

export function PropertyGallery({ images }: PropertyGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="relative h-[42vh] md:h-[52vh] min-h-[320px] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[42vh] md:h-[52vh] min-h-[320px] rounded-3xl overflow-hidden shadow-2xl">
        {/* Main Large Image */}
        <div className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded-tl-3xl" onClick={() => setSelectedImage(0)}>
          <img
            src={images[0]}
            alt="Property main"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        </div>

        {/* Secondary Images */}
        {images.slice(1, 5).map((img, i) => (
          <div
            key={i}
            className={`relative group cursor-pointer overflow-hidden ${i === 0 ? 'rounded-tr-3xl' : i === 3 ? 'rounded-br-3xl' : ''}`}
            onClick={() => setSelectedImage(i + 1)}
          >
            <img
              src={img}
              alt={`Property ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-12"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-50"
              onClick={() => setSelectedImage(null)}
            >
              <span className="text-2xl">✕</span>
            </button>

            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={images[selectedImage]}
              alt="Property Fullscreen"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
