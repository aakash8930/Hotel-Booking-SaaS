'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  rooms: unknown[];
  _count: { rooms: number };
}

export default function HostPropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    const res = await api.get<Property[]>('/host/properties');
    if (res.success && res.data) {
      setProperties(res.data);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Properties</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/host/billing')}
            className="btn-secondary"
          >
            Billing
          </button>
          <button
            onClick={() => router.push('/host/properties/new')}
            className="btn-primary"
          >
            + Add Property
          </button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-surface-500 mb-4">No properties yet.</p>
          <button
            onClick={() => router.push('/host/properties/new')}
            className="btn-primary"
          >
            Create your first property
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {properties.map((p) => (
            <div
              key={p.id}
              className="card p-6 cursor-pointer hover:shadow-md"
              onClick={() => router.push(`/host/properties/${p.id}`)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{p.name}</h2>
                  <p className="text-surface-500">
                    {p.city}, {p.state}
                  </p>
                  <p className="text-sm text-surface-400 mt-1">
                    {p._count.rooms} room{p._count.rooms !== 1 ? 's' : ''}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    p.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : p.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
