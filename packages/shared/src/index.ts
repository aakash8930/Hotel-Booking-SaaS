/**
 * @hbs/shared — Shared types and utilities between frontend and backend.
 *
 * This package contains:
 * - API response types
 * - Booking/property domain types (used in both Next.js and NestJS)
 * - Shared validation helpers
 * - Constants
 */

// ── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  timestamp?: string;
  path?: string;
}

// ── Auth Types ─────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  host: HostProfile;
}

export interface HostProfile {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Domain Types ───────────────────────────────────────────────────────────

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED';

export interface Property {
  id: string;
  hostId: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  coverImage: string | null;
  status: PropertyStatus;
  checkInTime: string;
  checkOutTime: string;
  rules: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  currency: string;
  images: string[];
  amenities: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface Booking {
  id: string;
  roomId: string;
  guestId: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  guests: number;
  status: BookingStatus;
  holdExpiresAt: string | null;
  totalPrice: number;
  currency: string;
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  email: string;
  name: string;
  phone: string | null;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerTxnId: string | null;
  initiatedAt: string;
  completedAt: string | null;
}

// ── Real-time Events ───────────────────────────────────────────────────────

export interface RealtimeEvent {
  type: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_PAID' | 'AVAILABILITY_CHANGED';
  roomId: string;
  propertyId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const BOOKING_HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
] as const;

export const COMMON_AMENITIES = [
  'wifi', 'ac', 'heater', 'hot-water', 'breakfast',
  'parking', 'tv', 'balcony', 'mountain-view', 'sea-view',
  'garden', 'pool', 'kitchen', 'washing-machine', 'extra-bed',
  'pet-friendly', 'power-backup', 'room-service',
] as const;

// ── Utility Functions ──────────────────────────────────────────────────────

/**
 * Format INR currency with the Indian numbering system (₹12,34,567)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate the number of nights between two dates.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date range is valid (check-out after check-in, both in the future).
 */
export function isValidDateRange(checkIn: string, checkOut: string): boolean {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return end > start && start >= today;
}
