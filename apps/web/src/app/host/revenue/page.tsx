'use client';

import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function RevenueChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const width = 800;
  const height = 200;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => ({
    x: i * step,
    y: height - (val / max) * height,
  }));

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div className="relative w-full aspect-[4/1] overflow-hidden rounded-2xl bg-surface-900 p-6">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4841e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d4841e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Gradient Fill */}
        <path
          d={`${pathData} L ${points[points.length - 1].x},${height} L 0,${height} Z`}
          fill="url(#chartGradient)"
        />
        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          d={pathData}
          fill="none"
          stroke="#d4841e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#d4841e" stroke="white" strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}

export default function RevenuePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const res = await api.get('/host/analytics');
      if (res.success && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mock data for the chart if API doesn't provide time-series yet
  const revenueData = [1200, 1800, 1500, 2200, 3000, 2800, 3500, 4200, 3800, 4500, 5000, 4800];

  return (
    <div className="container-custom pt-32 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-4xl font-bold text-surface-900 mb-2">Revenue Intelligence</h1>
            <p className="text-surface-500">Your property performance and earnings overview.</p>
          </div>
          <Badge tone="success" className="text-sm py-1 px-3">
            Live Data
          </Badge>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString('en-IN') || '0'}`, trend: '+12%', color: 'text-emerald-500' },
            { label: 'Avg Daily Rate', value: `₹${stats?.adr?.toLocaleString('en-IN') || '0'}`, trend: '+5%', color: 'text-emerald-500' },
            { label: 'Occupancy Rate', value: `${stats?.occupancy || '0'}%`, trend: '-2%', color: 'text-red-500' },
            { label: 'RevPAR', value: `₹${stats?.revpar?.toLocaleString('en-IN') || '0'}`, trend: '+8%', color: 'text-emerald-500' },
          ].map((kpi, i) => (
            <div key={i} className="card p-6">
              <p className="text-sm text-surface-500 mb-1">{kpi.label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-surface-900">{kpi.value}</h3>
                <span className={`text-xs font-medium ${kpi.color}`}>{kpi.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-surface-900">Earnings Trend</h2>
            <div className="flex gap-2">
              <span className="text-xs text-surface-500">Last 12 Months</span>
            </div>
          </div>
          <RevenueChart data={revenueData} />
        </div>

        {/* AI Insight Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-8 bg-gradient-to-br from-brand-500 to-brand-700 text-white border-none relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">✨</span>
                <h3 className="text-xl font-bold">Revenue Recommendation</h3>
              </div>
              <p className="text-brand-50 leading-relaxed mb-6">
                Based on your current occupancy ( {stats?.occupancy || '0'}% ), your ADR is lower than the city average for this season.
                <br /><br />
                <strong>Suggestion:</strong> Increase prices for the upcoming weekend by 15% to maximize revenue without risking occupancy.
              </p>
              <Button className="bg-white text-brand-700 hover:bg-surface-100">
                Apply Dynamic Pricing
              </Button>
            </div>
            <div className="absolute -right-10 -bottom-10 text-white/10 text-9xl font-display font-bold select-none">
              AI
            </div>
          </div>

          <div className="card p-8">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Payout Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-surface-100">
                <span className="text-sm text-surface-600">Next Payout</span>
                <span className="font-medium text-surface-900">Oct 15</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-surface-100">
                <span className="text-sm text-surface-600">Pending Amount</span>
                <span className="font-medium text-brand-600">₹{stats?.pendingPayout?.toLocaleString('en-IN') || '0'}</span>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Request Advance
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
