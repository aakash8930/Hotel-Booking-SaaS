'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

interface QaPair {
  question: string;
  answer: string;
}

export function FaqChat({ propertyId }: { propertyId: string }) {
  const [question, setQuestion] = useState('');
  const [pairs, setPairs] = useState<QaPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError('');

    const res = await api.post<{ answer: string }>('/ai/faq', {
      propertyId,
      question: q,
    });

    if (res.success && res.data) {
      const { answer } = res.data;
      setPairs((prev) => [...prev, { question: q, answer }]);
      setQuestion('');
    } else {
      setError(res.error?.message || 'Could not answer that right now.');
    }
    setLoading(false);
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-surface-900 mb-1">Have a question?</h3>
      <p className="text-sm text-surface-500 mb-4">
        Ask about check-in, amenities, or anything else about this stay.
      </p>

      {pairs.length > 0 && (
        <div className="space-y-4 mb-4">
          <AnimatePresence initial={false}>
            {pairs.map((pair, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm"
              >
                <p className="font-medium text-surface-900 mb-1">{pair.question}</p>
                <p className="text-surface-600">{pair.answer}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          className="input text-sm"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Is parking available?"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="btn-secondary text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
