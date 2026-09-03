'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: 'Himachal Pradesh',
    pincode: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    status: 'ACTIVE',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await api.post('/host/properties', form);

    if (res.success) {
      router.push('/host/properties');
    } else {
      setError(res.error?.message || 'Failed to create property');
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Add New Property</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Property Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Mountain View Homestay"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            className="input min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A cozy homestay with stunning mountain views..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Village Dhungri, Near Hadimba Temple"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Manali"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State</label>
            <select
              className="input"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option>Himachal Pradesh</option>
              <option>Uttarakhand</option>
              <option>Goa</option>
              <option>Kerala</option>
              <option>Rajasthan</option>
              <option>Karnataka</option>
              <option>Tamil Nadu</option>
              <option>West Bengal</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Pincode</label>
          <input
            className="input"
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            placeholder="175131"
            pattern="\d{6}"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Check-in Time</label>
            <input
              type="time"
              className="input"
              value={form.checkInTime}
              onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Check-out Time</label>
            <input
              type="time"
              className="input"
              value={form.checkOutTime}
              onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Property'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
