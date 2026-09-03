'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Property } from '@hbs/shared';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const city = searchParams.get('city') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '2';

  useEffect(() => {
    if (city && checkIn && checkOut) {
      loadResults();
    } else {
      setLoading(false);
    }
  }, [city, checkIn, checkOut, guests]);

  async function loadResults() {
    const res = await api.get<Property[]>(
      `/search?city=${city}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
    );
    if (res.success && res.data) {
      setResults(res.data);
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Search Results</h1>
      <p className="text-surface-500 mb-8">
        {city} · {checkIn} to {checkOut} · {guests} guest{guests !== '1' ? 's' : ''}
      </p>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-surface-500">Searching available properties...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-surface-500 mb-4">No properties found for your search.</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            Try a different search
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {results.map((property) => (
            <div
              key={property.id}
              className="card p-6 cursor-pointer hover:shadow-md"
              onClick={() => router.push(`/property/${property.slug}`)}
            >
              <div className="flex gap-6">
                <div className="w-48 h-32 bg-surface-200 rounded-lg flex items-center justify-center">
                  <span className="text-surface-400 text-sm">No image</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-1">{property.name}</h2>
                  <p className="text-surface-500 text-sm mb-2">
                    {property.city}, {property.state}
                  </p>
                  <p className="text-surface-600 text-sm mb-4">{property.description}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-surface-500">
                      Check-in: {property.checkInTime}
                    </span>
                    <span className="text-surface-500">
                      Check-out: {property.checkOutTime}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600">
                    ₹{property.rooms[0]?.basePrice.toLocaleString('en-IN')}
                  </p>
                  <p className="text-surface-500 text-sm">per night</p>
                  <p className="text-green-600 text-sm mt-2">
                    {property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
