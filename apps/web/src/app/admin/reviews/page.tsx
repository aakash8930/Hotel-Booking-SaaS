'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RequireAdmin } from '@/components/admin/require-admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/property/star-rating';

interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  reportCount: number;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
  guest: { name: string; email: string };
  property: { name: string; slug: string };
}

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'reported', label: 'Reported' },
  { value: 'hidden', label: 'Hidden' },
];

export default function AdminReviewsPage() {
  return (
    <RequireAdmin>
      <AdminReviewsView />
    </RequireAdmin>
  );
}

function AdminReviewsView() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadReviews() {
    setLoading(true);
    const res = await adminApi.get<AdminReview[]>(`/admin/reviews${filter ? `?filter=${filter}` : ''}`);
    if (res.success && res.data) setReviews(res.data);
    setLoading(false);
  }

  async function setHidden(reviewId: string, hidden: boolean) {
    setActioningId(reviewId);
    await adminApi.put(`/admin/reviews/${reviewId}/hidden`, { hidden, reason: hidden ? 'Hidden by admin' : undefined });
    await loadReviews();
    setActioningId(null);
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-6xl premium-admin-page">
      <AdminNav />
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-6">Reviews</h1>

      <div className="flex gap-2 mb-8">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === f.value
                ? 'bg-brand-500/15 text-brand-300 border-brand-500/40'
                : 'bg-surface-100 text-surface-600 border-surface-300 hover:border-surface-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-surface-500 text-center py-16">No reviews match this filter.</p>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="card p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={r.rating} size="sm" />
                    <span className="font-medium text-surface-900 text-sm">{r.property.name}</span>
                    {r.reportCount > 0 && (
                      <Badge tone="warning">{r.reportCount} report{r.reportCount !== 1 ? 's' : ''}</Badge>
                    )}
                    {r.hiddenAt && <Badge tone="danger">Hidden</Badge>}
                  </div>
                  {r.comment && <p className="text-surface-600 text-sm mb-1">{r.comment}</p>}
                  <p className="text-surface-500 text-xs">
                    {r.guest.name} ({r.guest.email}) · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  {r.hiddenReason && <p className="text-surface-500 text-xs mt-1">Reason: {r.hiddenReason}</p>}
                </div>

                <div className="shrink-0">
                  {r.hiddenAt ? (
                    <button
                      onClick={() => setHidden(r.id, false)}
                      disabled={actioningId === r.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                    >
                      Unhide
                    </button>
                  ) : (
                    <button
                      onClick={() => setHidden(r.id, true)}
                      disabled={actioningId === r.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
