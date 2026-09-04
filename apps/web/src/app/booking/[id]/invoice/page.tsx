'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { Invoice } from '@hbs/shared';

export default function InvoicePage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [bookingId]);

  async function load() {
    const res = await api.get<Invoice>(`/bookings/${bookingId}/invoice`);
    if (res.success && res.data) {
      setInvoice(res.data);
    } else {
      setError(res.error?.message || 'Invoice not available yet');
    }
    setLoading(false);
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!invoice)
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-500 px-4 text-center">
        {error}
      </div>
    );

  const { booking } = invoice;
  const property = booking.room.property;
  const host = property.host;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000,
    ),
  );

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-3xl print:pt-0 print:max-w-full">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="font-display text-2xl font-bold text-surface-900">Tax invoice</h1>
        <Button size="sm" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <div className="card p-8 print:border-0 print:shadow-none print:bg-white print:text-black">
        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900 print:text-black">
              {host.businessName || host.name}
            </h2>
            <p className="text-surface-600 print:text-black text-sm mt-1">
              {property.name}
              <br />
              {property.address}, {property.city}, {property.state} {property.pincode}
            </p>
            <p className="text-surface-500 print:text-black text-sm mt-1">
              {invoice.hostGstin ? `GSTIN: ${invoice.hostGstin}` : 'Unregistered supplier (no GSTIN on file)'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-surface-900 print:text-black">{invoice.invoiceNumber}</p>
            <p className="text-surface-500 print:text-black text-sm">
              {new Date(invoice.issuedAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-surface-500 print:text-black mb-1">Billed to</p>
            <p className="font-medium text-surface-900 print:text-black">{booking.guest.name}</p>
            <p className="text-surface-600 print:text-black">{booking.guest.email}</p>
          </div>
          <div>
            <p className="text-surface-500 print:text-black mb-1">Stay details</p>
            <p className="text-surface-900 print:text-black">
              {booking.room.name} · {nights} night{nights !== 1 ? 's' : ''} · {booking.guests} guest
              {booking.guests !== 1 ? 's' : ''}
            </p>
            <p className="text-surface-600 print:text-black">
              {new Date(booking.checkIn).toLocaleDateString('en-IN')} →{' '}
              {new Date(booking.checkOut).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-surface-300 print:border-black text-left text-surface-500 print:text-black">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">SAC</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-surface-200 print:border-black/30">
              <td className="py-3 text-surface-900 print:text-black">
                Accommodation — {property.name} ({nights} night{nights !== 1 ? 's' : ''})
              </td>
              <td className="py-3 text-surface-600 print:text-black">{invoice.sacCode}</td>
              <td className="py-3 text-right text-surface-900 print:text-black">
                ₹{invoice.taxableAmount.toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-surface-600 print:text-black">
              <span>Taxable value</span>
              <span>₹{invoice.taxableAmount.toLocaleString('en-IN')}</span>
            </div>
            {invoice.cgstAmount > 0 && (
              <div className="flex justify-between text-surface-600 print:text-black">
                <span>CGST ({(invoice.gstRate / 2).toFixed(1)}%)</span>
                <span>₹{invoice.cgstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {invoice.sgstAmount > 0 && (
              <div className="flex justify-between text-surface-600 print:text-black">
                <span>SGST ({(invoice.gstRate / 2).toFixed(1)}%)</span>
                <span>₹{invoice.sgstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {invoice.igstAmount > 0 && (
              <div className="flex justify-between text-surface-600 print:text-black">
                <span>IGST ({invoice.gstRate.toFixed(1)}%)</span>
                <span>₹{invoice.igstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-surface-900 print:text-black pt-2 border-t border-surface-300 print:border-black">
              <span>Total</span>
              <span>₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-surface-500 print:text-black mt-8">
          Place of supply: {invoice.placeOfSupply}. Booking ID: {invoice.bookingId}.
        </p>
      </div>
    </div>
  );
}
