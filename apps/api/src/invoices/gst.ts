/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GST calculation for hotel/accommodation invoices
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A deliberately simplified but real GST computation, not a full tax
 * engine — accurate enough to issue a legitimate invoice, not a substitute
 * for an accountant:
 *
 *   - SAC 996311 ("Room or unit accommodation services provided by Hotels,
 *     INN, Guest House, Club, etc.") on every invoice — the one code this
 *     product needs since it only sells accommodation.
 *   - Rate follows the per-night tariff slab (current structure at time of
 *     writing): <= ₹1,000/night exempt, ₹1,001-7,500 = 12%, > ₹7,500 = 18%.
 *     GST slabs on accommodation have changed before (most recently 2022)
 *     and may again — this constant is the thing to update when they do.
 *   - `totalPrice` on a Booking is treated as the taxable value with GST
 *     added on top (not tax-inclusive) — matches how `basePrice` is set
 *     by hosts elsewhere in this codebase (a plain nightly rate, no tax
 *     math baked in).
 *   - CGST+SGST split when the host's GSTIN state code matches the
 *     property's state (the normal case: a host is usually registered
 *     wherever their property actually is); IGST when they don't. Place
 *     of supply for accommodation is always the property's state
 *     (Section 12(3), IGST Act) — this is compared against the *host's*
 *     registration state, not the guest's location.
 *   - No GSTIN on file → issued as an unregistered-supplier invoice: 0%
 *     tax, no CGST/SGST/IGST lines. Still a legitimate, issuable invoice;
 *     the guest just can't claim input tax credit against it.
 */

export const ACCOMMODATION_SAC_CODE = '996311';

/** CBIC GST state codes — the first two digits of every GSTIN. */
export const GST_STATE_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  Maharashtra: '27',
  'Andhra Pradesh': '37',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman and Nicobar Islands': '35',
  Telangana: '36',
  Ladakh: '38',
};

export interface GstBreakdown {
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  isRegistered: boolean;
}

function gstRateForNightlyTariff(perNightRate: number): number {
  if (perNightRate <= 1000) return 0;
  if (perNightRate <= 7500) return 12;
  return 18;
}

export function calculateGst(params: {
  totalPrice: number;
  nights: number;
  propertyState: string;
  hostGstin: string | null;
}): GstBreakdown {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const taxableAmount = round2(params.totalPrice);

  if (!params.hostGstin) {
    return {
      gstRate: 0,
      taxableAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: taxableAmount,
      isRegistered: false,
    };
  }

  const perNightRate = params.totalPrice / Math.max(params.nights, 1);
  const gstRate = gstRateForNightlyTariff(perNightRate);
  const taxAmount = round2(taxableAmount * (gstRate / 100));

  const hostStateCode = params.hostGstin.slice(0, 2);
  const propertyStateCode = GST_STATE_CODES[params.propertyState];
  const isIntraState = hostStateCode === propertyStateCode;

  return {
    gstRate,
    taxableAmount,
    cgstAmount: isIntraState ? round2(taxAmount / 2) : 0,
    sgstAmount: isIntraState ? round2(taxAmount / 2) : 0,
    igstAmount: isIntraState ? 0 : taxAmount,
    totalAmount: round2(taxableAmount + taxAmount),
    isRegistered: true,
  };
}
