'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequireHost } from '@/components/host/require-host';

interface Room {
  id: string;
  name: string;
  capacity: number;
  basePrice: number;
  amenities: string[];
  isActive: boolean;
  _count?: { bookings: number };
}

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  rooms: Room[];
}

export default function PropertyDetailPage() {
  return (
    <RequireHost>
      <PropertyDetailView />
    </RequireHost>
  );
}

function PropertyDetailView() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    capacity: 2,
    basePrice: 2500,
    amenities: '',
  });

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  async function loadProperty() {
    const res = await api.get<Property>(`/host/properties/${propertyId}`);
    if (res.success && res.data) {
      setProperty(res.data);
    }
    setLoading(false);
  }

  async function addRoom(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.post(`/host/properties/${propertyId}/rooms`, {
      ...roomForm,
      amenities: roomForm.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    });

    if (res.success) {
      setShowRoomForm(false);
      setRoomForm({ name: '', description: '', capacity: 2, basePrice: 2500, amenities: '' });
      loadProperty();
    }
  }

  async function toggleRoom(roomId: string, isActive: boolean) {
    await api.put(`/host/properties/${propertyId}/rooms/${roomId}`, {
      isActive: !isActive,
    });
    loadProperty();
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center premium-property-editor">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!property)
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-500">
        Property not found
      </div>
    );

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-6xl">
      <button onClick={() => router.push('/host/properties')} className="text-sm text-surface-500 mb-4 hover:text-surface-800 hover:underline transition-colors">
        ← Back to properties
      </button>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-surface-900">{property.name}</h1>
          <p className="text-surface-500">
            {property.city}, {property.state}
          </p>
        </div>
        <Badge tone={property.status === 'ACTIVE' ? 'success' : 'warning'}>{property.status}</Badge>
      </div>

      {/* Rooms Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-surface-900">Rooms</h2>
          <Button size="sm" onClick={() => setShowRoomForm(!showRoomForm)}>
            {showRoomForm ? 'Cancel' : '+ Add room'}
          </Button>
        </div>

        {showRoomForm && (
          <form onSubmit={addRoom} className="card p-6 mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name</label>
                <input
                  className="input"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="Deluxe Mountain Room"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  className="input"
                  value={roomForm.capacity}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })
                  }
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="input"
                value={roomForm.description}
                onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Price per night (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={roomForm.basePrice}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, basePrice: parseInt(e.target.value) })
                  }
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amenities (comma-separated)</label>
                <input
                  className="input"
                  value={roomForm.amenities}
                  onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
                  placeholder="wifi, ac, heater, balcony"
                />
              </div>
            </div>
            <Button type="submit">Save room</Button>
          </form>
        )}

        {property.rooms.length === 0 ? (
          <p className="text-surface-500 py-8 text-center">No rooms yet. Add your first room above.</p>
        ) : (
          <div className="grid gap-4">
            {property.rooms.map((room) => (
              <div key={room.id} className="card p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-surface-900">{room.name}</h3>
                    <p className="text-surface-500 text-sm">
                      Capacity: {room.capacity} · ₹{Number(room.basePrice).toLocaleString('en-IN')}/night
                    </p>
                    {room.amenities.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {room.amenities.map((a) => (
                          <span key={a} className="px-2 py-0.5 bg-surface-200 rounded text-xs text-surface-600">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleRoom(room.id, room.isActive)}
                    className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                      room.isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                    }`}
                  >
                    {room.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
