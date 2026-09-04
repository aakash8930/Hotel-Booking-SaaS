'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, FieldLabel } from '@/components/ui/input';
import { StarRating } from '@/components/property/star-rating';
import type { Property, Room } from '@hbs/shared';

type PropertyWithRooms = Property & { rooms: Room[] };

interface SearchResponse {
  properties: PropertyWithRooms[];
  search: {
    checkIn: string;
    checkOut: string;
    guests: number | null;
    city: string | null;
    state: string | null;
    nights: number;
  };
  total: number;
}

const AMENITY_OPTIONS = ['wifi', 'ac', 'breakfast', 'parking', 'kitchen', 'heater', 'tv', 'balcony'];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<PropertyWithRooms[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const city = searchParams.get('city') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '2';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minRating = searchParams.get('minRating') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const selectedAmenities = (searchParams.get('amenities') || '').split(',').filter(Boolean);

  // Local, uncommitted filter state — pushed to the URL (and refetched) on "Apply filters".
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);
  const [draftMinRating, setDraftMinRating] = useState(minRating);
  const [draftAmenities, setDraftAmenities] = useState<string[]>(selectedAmenities);

  useEffect(() => {
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setDraftMinRating(minRating);
    setDraftAmenities(selectedAmenities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice, minRating, searchParams.get('amenities')]);

  useEffect(() => {
    if (city && checkIn && checkOut) {
      loadResults();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, checkIn, checkOut, guests, minPrice, maxPrice, minRating, sortBy, searchParams.get('amenities')]);

  async function loadResults() {
    setLoading(true);
    const params = new URLSearchParams({ city, checkIn, checkOut, guests });
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    if (sortBy) params.set('sortBy', sortBy);
    if (selectedAmenities.length > 0) params.set('amenities', selectedAmenities.join(','));

    const res = await api.get<SearchResponse>(`/search?${params.toString()}`);
    if (res.success && res.data) {
      setResults(res.data.properties);
      setTotal(res.data.total);
    }
    setLoading(false);
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/search?${params.toString()}`);
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (draftMinPrice) params.set('minPrice', draftMinPrice);
    else params.delete('minPrice');
    if (draftMaxPrice) params.set('maxPrice', draftMaxPrice);
    else params.delete('maxPrice');
    if (draftMinRating) params.set('minRating', draftMinRating);
    else params.delete('minRating');
    if (draftAmenities.length > 0) params.set('amenities', draftAmenities.join(','));
    else params.delete('amenities');
    router.push(`/search?${params.toString()}`);
  }

  function toggleAmenity(amenity: string) {
    setDraftAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  }

  const hasActiveFilters = minPrice || maxPrice || minRating || selectedAmenities.length > 0;

  return (
    <div className="container-custom pt-28 pb-12 md:pt-32">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-2">
          {city ? `Stays in ${city}` : 'Search results'}
        </h1>
        <p className="text-surface-500">
          {checkIn} → {checkOut} · {guests} guest{guests !== '1' ? 's' : ''}
          {!loading && ` · ${total} found`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Filters */}
        <aside className="card p-6 h-fit lg:sticky lg:top-28 space-y-6">
          <div>
            <h3 className="font-semibold text-surface-900 mb-3 text-sm">Price per night</h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={draftMinPrice}
                onChange={(e) => setDraftMinPrice(e.target.value)}
                className="text-sm"
              />
              <span className="text-surface-500">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={draftMaxPrice}
                onChange={(e) => setDraftMaxPrice(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-surface-900 mb-3 text-sm">Minimum rating</h3>
            <div className="flex gap-2 flex-wrap">
              {[4, 3, 2].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDraftMinRating(draftMinRating === String(r) ? '' : String(r))}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    draftMinRating === String(r)
                      ? 'bg-brand-500/15 text-brand-300 border-brand-500/40'
                      : 'bg-surface-100 text-surface-600 border-surface-300 hover:border-surface-400'
                  }`}
                >
                  {r}+ ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-surface-900 mb-3 text-sm">Amenities</h3>
            <div className="flex flex-col gap-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftAmenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="rounded border-surface-400 accent-brand-500"
                  />
                  <span className="capitalize">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <Button size="sm" className="w-full" onClick={applyFilters}>
            Apply filters
          </Button>
          {hasActiveFilters && (
            <button
              onClick={() => router.push(`/search?city=${city}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)}
              className="text-xs text-surface-500 hover:text-surface-800 hover:underline w-full text-center transition-colors"
            >
              Clear filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div>
          <div className="flex justify-end mb-4">
            <FieldLabel htmlFor="sort" className="sr-only">
              Sort
            </FieldLabel>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => updateParam('sortBy', e.target.value)}
              className="input text-sm w-auto py-2"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="grid gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="flex gap-6">
                    <div className="w-48 h-32 bg-surface-200 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-5 bg-surface-200 rounded w-1/3" />
                      <div className="h-4 bg-surface-100 rounded w-1/4" />
                      <div className="h-4 bg-surface-100 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-surface-500 mb-4">No properties found for your search.</p>
              <Button onClick={() => router.push('/')}>Try a different search</Button>
            </div>
          ) : (
            <motion.div
              className="grid gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {results.map((property) => (
                <motion.div
                  key={property.id}
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="card p-6 cursor-pointer"
                  onClick={() => router.push(`/property/${property.slug}`)}
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-48 h-32 rounded-lg shrink-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex items-center justify-center overflow-hidden relative">
                      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
                      <span className="relative text-white/90 font-display text-lg">
                        {property.city}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-semibold text-surface-900">
                          {property.name}
                        </h2>
                        {property.averageRating && (
                          <span className="inline-flex items-center gap-1 text-xs text-surface-600">
                            <StarRating rating={property.averageRating} size="sm" />
                            {property.averageRating}
                          </span>
                        )}
                      </div>
                      <p className="text-surface-500 text-sm mb-2">
                        {property.city}, {property.state}
                      </p>
                      <p className="text-surface-600 text-sm mb-4 line-clamp-2">
                        {property.description}
                      </p>
                      <div className="flex gap-4 text-sm text-surface-500">
                        <span>Check-in: {property.checkInTime}</span>
                        <span>Check-out: {property.checkOutTime}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {property.rooms[0] && (
                        <>
                          <p className="text-2xl font-bold text-brand-400">
                            ₹{property.rooms[0].basePrice.toLocaleString('en-IN')}
                          </p>
                          <p className="text-surface-500 text-sm">per night</p>
                        </>
                      )}
                      <Badge tone="success" className="mt-2">
                        {property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''} available
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
