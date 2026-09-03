'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Property, Room } from '@hbs/shared';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperty();
  }, [slug]);

  async function loadProperty() {
    const res = await api.get<Property>(`/properties/${slug}`);
    if (res.success && res.data) {
      setProperty(res.data);
    }
    setLoading(false);
  }

  function handleBookRoom(room: Room) {
    setSelectedRoom(room);
    router.push(
      `/booking/${room.id}?propertyId=${property?.id}&checkIn=${new Date().toISOString().split('T')[0]}&checkOut=${new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}`,
    );
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!property) return <div className="p-8">Property not found</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-surface-500 mb-4 hover:underline">
        ← Back to search
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{property.name}</h1>
        <p className="text-surface-500 text-lg mb-4">
          {property.city}, {property.state}
        </p>
        <p className="text-surface-700">{property.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2">Check-in</h3>
          <p className="text-surface-600">{property.checkInTime}</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Check-out</h3>
          <p className="text-surface-600">{property.checkOutTime}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Available Rooms</h2>
        <div className="grid gap-4">
          {property.rooms.map((room) => (
            <div key={room.id} className="card p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{room.name}</h3>
                  <p className="text-surface-600 text-sm mb-3">{room.description}</p>
                  <div className="flex gap-4 text-sm text-surface-500 mb-3">
                    <span>Capacity: {room.capacity} guests</span>
                  </div>
                  {room.amenities.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {room.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-3 py-1 bg-surface-100 rounded-full text-xs"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-6">
                  <p className="text-3xl font-bold text-brand-600">
                    ₹{room.basePrice.toLocaleString('en-IN')}
                  </p>
                  <p className="text-surface-500 text-sm mb-3">per night</p>
                  <button
                    onClick={() => handleBookRoom(room)}
                    className="btn-primary"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
