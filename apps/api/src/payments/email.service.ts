/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Booking Confirmation Email Service (Resend)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Sends a booking confirmation email once a payment succeeds.
 *
 * Without RESEND_API_KEY configured, this logs and no-ops instead of
 * throwing — a booking must never fail because email delivery failed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface BookingConfirmationEmailParams {
  guestEmail: string;
  guestName: string;
  propertyName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  bookingId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromAddress = this.config.get<string>(
      'EMAIL_FROM',
      'bookings@yourdomain.com',
    );
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!this.resend) {
      this.logger.warn(
        'Resend not configured — booking confirmation emails will be logged, not sent. ' +
          'Set RESEND_API_KEY in .env to enable.',
      );
    }
  }

  /**
   * Send a booking confirmation email. Never throws — email failures must
   * not roll back a successful payment/booking transition.
   */
  async sendBookingConfirmation(params: BookingConfirmationEmailParams): Promise<void> {
    const subject = `Booking confirmed: ${params.propertyName}`;
    const text =
      `Hi ${params.guestName},\n\n` +
      `Your booking at ${params.propertyName} is confirmed.\n\n` +
      `Room: ${params.roomName}\n` +
      `Check-in: ${params.checkIn}\n` +
      `Check-out: ${params.checkOut}\n` +
      `Total paid: ${params.currency} ${params.totalPrice}\n` +
      `Booking ID: ${params.bookingId}\n\n` +
      `See you soon!`;

    if (!this.resend) {
      this.logger.log(
        `[email skipped, no RESEND_API_KEY] Would send to ${params.guestEmail}: "${subject}"`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: params.guestEmail,
        subject,
        text,
      });
      this.logger.log(`Confirmation email sent to ${params.guestEmail} for booking ${params.bookingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email for booking ${params.bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
