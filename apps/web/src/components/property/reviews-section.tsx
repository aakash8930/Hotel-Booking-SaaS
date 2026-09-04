'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, guestApi } from '@/lib/api';
import { useGuestSession } from '@/lib/guest-session';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { StarRating, InteractiveStarRating } from './star-rating';
import type { Review } from '@hbs/shared';

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number | null;
  totalReviews: number;
}

export function ReviewsSection({ propertyId }: { propertyId: string }) {
  const searchParams = useSearchParams();
  const reviewableBookingId = searchParams.get('review');
  const { isLoggedIn } = useGuestSession();

  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReviews();
  }, [propertyId]);

  async function loadReviews() {
    const res = await api.get<ReviewsResponse>(`/reviews/property/${propertyId}`);
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewableBookingId) return;
    setSubmitting(true);
    setSubmitError('');

    const res = await guestApi.post('/reviews', {
      bookingId: reviewableBookingId,
      rating,
      comment: comment.trim() || undefined,
    });

    if (res.success) {
      setSubmitted(true);
      loadReviews();
    } else {
      setSubmitError(res.error?.message || 'Could not submit your review');
    }
    setSubmitting(false);
  }

  async function handleReport(reviewId: string) {
    if (!isLoggedIn) return;
    const res = await guestApi.post(`/reviews/${reviewId}/report`);
    if (res.success) {
      setReportedIds((prev) => new Set(prev).add(reviewId));
    }
  }

  return (
    <div id="reviews" className="scroll-mt-28">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-surface-900">Reviews</h2>
        {data?.averageRating && (
          <div className="flex items-center gap-2">
            <StarRating rating={data.averageRating} />
            <span className="text-surface-500 text-sm">
              {data.averageRating} · {data.totalReviews} review{data.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {reviewableBookingId && (
        <div className="card p-6 mb-8 border-brand-500/30">
          {submitted ? (
            <p className="text-emerald-400 text-sm">Thanks — your review has been posted.</p>
          ) : isLoggedIn ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-semibold text-surface-900">Rate your stay</h3>
              <InteractiveStarRating value={rating} onChange={setRating} />
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was your stay? (optional)"
                rows={3}
              />
              {submitError && <p className="text-sm text-red-400">{submitError}</p>}
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit review'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-surface-500">
              Sign in to your guest account to leave a review for this stay.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : !data || data.reviews.length === 0 ? (
        <p className="text-surface-500 text-sm">No reviews yet — be the first to stay and share your experience.</p>
      ) : (
        <div className="space-y-4">
          {data.reviews.map((review) => (
            <div key={review.id} className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-surface-900">{review.guestName}</span>
                <StarRating rating={review.rating} size="sm" />
              </div>
              {review.comment && <p className="text-surface-600 text-sm mb-2">{review.comment}</p>}
              <p className="text-surface-500 text-xs">
                {new Date(review.createdAt).toLocaleDateString()}
              </p>
              {review.hostReply && (
                <div className="mt-3 pl-4 border-l-2 border-brand-500/30">
                  <p className="text-xs font-medium text-brand-300 mb-1">Response from host</p>
                  <p className="text-surface-600 text-sm">{review.hostReply}</p>
                </div>
              )}
              <div className="mt-3 text-right">
                {reportedIds.has(review.id) ? (
                  <span className="text-xs text-surface-500">Reported</span>
                ) : isLoggedIn ? (
                  <button
                    onClick={() => handleReport(review.id)}
                    className="text-xs text-surface-500 hover:text-red-400 transition-colors"
                  >
                    Report
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
