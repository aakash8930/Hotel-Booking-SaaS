'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Insight = {
  property: { id: string; name: string; currency: string };
  summary: { revenue30d: number; bookings30d: number; confirmedBookings30d: number; cancellations30d: number; averageBookingValue: number };
  roomStats: Array<{ roomId: string; roomName: string; basePrice: number; bookings: number; bookedNights: number; revenue: number }>;
  demandForecast: Array<{ date: string; bookedRooms: number; availableRooms: number; demandRatio: number }>;
  recommendations: Array<{ type: string; priority: string; title: string; message: string }>;
};

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function RevenuePage() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const properties = await api.get<any>('/properties/mine');
      const first = properties.data?.[0] ?? properties.data?.properties?.[0];
      if (!first?.id) { setError('Create a property first to unlock Revenue Intelligence.'); setLoading(false); return; }
      const result = await api.get<Insight>(`/host/revenue/${first.id}`);
      if (!result.success || !result.data) setError(result.error?.message ?? 'Unable to load revenue intelligence.');
      else setInsight(result.data);
      setLoading(false);
    };
    void load();
  }, []);

  const maxDemand = useMemo(() => Math.max(100, ...(insight?.demandForecast.map(d => d.demandRatio) ?? [])), [insight]);

  if (loading) return <main className="min-h-screen p-8 md:p-12"><div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-12 w-80 rounded-2xl bg-muted" /><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-32 rounded-3xl bg-muted" />)}</div><div className="h-96 rounded-3xl bg-muted" /></div></main>;
  if (error || !insight) return <main className="min-h-screen p-8 md:p-12"><div className="mx-auto max-w-3xl rounded-3xl border bg-card p-10 shadow-sm"><p className="text-sm font-medium text-muted-foreground">Revenue Intelligence</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{error || 'No data available'}</h1><p className="mt-3 text-muted-foreground">Once your property has bookings, StayEase will turn them into practical pricing and demand signals.</p></div></main>;

  return <main className="min-h-screen bg-background p-5 md:p-10"><div className="mx-auto max-w-7xl space-y-7">
    <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-medium text-muted-foreground">Revenue Intelligence</p><h1 className="mt-1 text-4xl font-semibold tracking-tight">{insight.property.name}</h1><p className="mt-2 text-muted-foreground">Performance, demand and the next decision worth making.</p></div><div className="rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground">Live property signal</div></header>

    <section className="grid gap-4 md:grid-cols-4">{[
      ['Revenue · 30d', money(insight.summary.revenue30d), 'Collected from paid stays'],
      ['Bookings · 30d', insight.summary.bookings30d.toString(), 'All non-expired bookings'],
      ['Confirmed', insight.summary.confirmedBookings30d.toString(), 'Confirmed or paid stays'],
      ['Avg. booking', money(insight.summary.averageBookingValue), 'Average booking value'],
    ].map(([label,value,note]) => <article key={label} className="rounded-3xl border bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></article>)}</section>

    <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><article className="rounded-3xl border bg-card p-6 shadow-sm"><div><h2 className="text-lg font-semibold">Demand outlook</h2><p className="text-sm text-muted-foreground">Next 14 days based on current reservations</p></div><div className="mt-8 flex h-64 items-end gap-2 overflow-hidden">{insight.demandForecast.map((d,i) => <div key={d.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="relative w-full max-w-9 rounded-t-xl bg-foreground/10 transition-all duration-500 group-hover:bg-foreground/20" style={{height: Math.max(8,(d.demandRatio/maxDemand)*190)}}><div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-foreground/70" style={{height: Math.min(100,d.demandRatio)+'%'}} /></div><span className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>{i%2===0 && <span className="text-[10px] font-medium">{d.demandRatio}%</span>}</div>)}</div></article>

    <article className="rounded-3xl border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold">What deserves attention</h2><p className="text-sm text-muted-foreground">Transparent recommendations, no auto-pricing.</p><div className="mt-5 space-y-3">{insight.recommendations.map((r,i)=><div key={i} className="rounded-2xl border bg-muted/30 p-4"><div className="text-xs font-semibold uppercase tracking-wider">{r.priority} <span className="font-normal text-muted-foreground">· {r.type}</span></div><h3 className="mt-2 font-medium">{r.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{r.message}</p></div>)}</div></article></section>

    <section className="rounded-3xl border bg-card p-6 shadow-sm"><h2 className="text-lg font-semibold">Room economics</h2><p className="text-sm text-muted-foreground">Which rooms are actually producing revenue?</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3">Room</th><th className="pb-3">Base price</th><th className="pb-3">Bookings</th><th className="pb-3">Nights</th><th className="pb-3 text-right">Revenue</th></tr></thead><tbody>{insight.roomStats.map(room=><tr key={room.roomId} className="border-t"><td className="py-4 font-medium">{room.roomName}</td><td className="py-4">{money(room.basePrice)}</td><td className="py-4">{room.bookings}</td><td className="py-4">{room.bookedNights}</td><td className="py-4 text-right font-semibold">{money(room.revenue)}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
