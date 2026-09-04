'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function SearchCTA() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      city: destination,
      checkIn,
      checkOut,
      guests,
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section id="search" className="section relative overflow-hidden bg-surface-100 border-t border-surface-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(212,132,30,0.08),transparent)]" />
      <div className="container-custom relative">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-surface-900 mb-4">
              Where to next?
            </h2>
            <p className="text-lg text-surface-600">
              Find your perfect stay — from mountain hideaways to beachside retreats.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="card p-6 md:p-8 shadow-glow"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Manali, Goa, Rishikesh..."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Guests
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="input"
                >
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="3">3 guests</option>
                  <option value="4">4 guests</option>
                  <option value="5">5+ guests</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full text-lg py-4">
              Search stays
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
