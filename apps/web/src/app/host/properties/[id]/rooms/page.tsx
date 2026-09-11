'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, FieldLabel } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Room, Property } from '@hbs/shared';

export default function RoomManagementPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [propertyId]);

  async function loadData() {
    setLoading(true);
    try {
      const propRes = await api.get(`/host/properties/${propertyId}`);
      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }
      // We assume the property detail API doesn't return all rooms, so we fetch them specifically
      // For this pilot, I'll use the property detail as the source if it has them, otherwise fetch
      const roomsRes = await api.get(`/host/properties/${propertyId}/rooms`);
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }
    } catch (e) {
      console.error('Error loading room data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRoom(updatedRoom: Partial<Room>) {
    setSaving(true);
    try {
      const res = await api.put(`/host/properties/${propertyId}/rooms/${editingRoom?.id}`, updatedRoom);
      if (res.success) {
        await loadData();
        setEditingRoom(null);
      }
    } catch (e) {
      console.error('Error updating room:', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-custom pt-32 pb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-surface-900 mb-2">
            {property?.name} Rooms
          </h1>
          <p className="text-surface-500">Manage pricing, capacity and amenities for your rooms.</p>
        </div>
        <Button onClick={() => router.push(`/host/properties/${propertyId}`)}>
          Back to Property
        </Button>
      </div>

      <div className="grid gap-6">
        {rooms.map((room) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-surface-900">{room.name}</h3>
                <Badge tone={room.isActive ? 'success' : 'error'}>
                  {room.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex gap-6 text-sm text-surface-500">
                <span>Capacity: <strong>{room.capacity} guests</strong></span>
                <span>Price: <strong>₹{room.basePrice.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setEditingRoom(room)}>
              Edit Room
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRoom(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-50 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-2xl font-bold text-surface-900">Edit Room</h2>
                  <button onClick={() => setEditingRoom(null)} className="text-surface-400 hover:text-surface-900">✕</button>
                </div>

                <form className="space-y-6" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateRoom({
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    basePrice: Number(formData.get('price')),
                    capacity: Number(formData.get('capacity')),
                  });
                }}>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="name">Room Name</FieldLabel>
                    <Input id="name" name="name" defaultValue={editingRoom.name} />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Input id="description" name="description" defaultValue={editingRoom.description} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="price">Base Price (₹)</FieldLabel>
                      <Input id="price" name="price" type="number" defaultValue={Number(editingRoom.basePrice)} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
                      <Input id="capacity" name="capacity" type="number" defaultValue={editingRoom.capacity} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setEditingRoom(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? 'Saving...' : 'Update Room'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
