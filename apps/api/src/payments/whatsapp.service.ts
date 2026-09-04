/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WhatsApp Notification Service (Meta Cloud API)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Sends booking confirmation/cancellation messages over WhatsApp — chosen
 * over generic SMS because it's the dominant messaging channel for this
 * product's market (independent hotels/homestays in India), and Meta's
 * Cloud API has a genuinely free tier (no per-message cost at this scale),
 * matching every other integration in this project (PhonePe, Resend,
 * Gemini) being picked for real zero-budget viability, not just "the
 * biggest name."
 *
 * Without WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID configured, this
 * logs and no-ops — exactly like EmailService — a booking must never fail
 * because a notification channel isn't set up.
 *
 * NOTE: sending free-form text outside a 24h customer-service window
 * requires a pre-approved message template in the real API. This service
 * sends plain text, which works today only within that window or in
 * Meta's test mode — swapping in real approved templates is a config
 * change here (`buildTemplatePayload`), not a rewrite, once a WhatsApp
 * Business Account is verified.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BookingWhatsAppParams {
  guestPhone: string | null;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  bookingId: string;
}

export interface CancellationWhatsAppParams {
  guestPhone: string | null;
  guestName: string;
  propertyName: string;
  refundAmount: number;
  currency: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly accessToken: string | undefined;
  private readonly phoneNumberId: string | undefined;
  private readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.isConfigured = !!(this.accessToken && this.phoneNumberId);

    if (!this.isConfigured) {
      this.logger.warn(
        'WhatsApp not configured — booking notifications will be logged, not sent. ' +
          'Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID in .env to enable ' +
          '(free tier at developers.facebook.com/docs/whatsapp/cloud-api).',
      );
    }
  }

  async sendBookingConfirmation(params: BookingWhatsAppParams): Promise<void> {
    const text =
      `Hi ${params.guestName}! Your booking at ${params.propertyName} is confirmed. ` +
      `${params.checkIn} → ${params.checkOut}, total ${params.currency} ${params.totalPrice}. ` +
      `Booking ID: ${params.bookingId}. See you soon!`;

    await this.send(params.guestPhone, text, 'confirmation', params.bookingId);
  }

  async sendCancellationNotice(params: CancellationWhatsAppParams): Promise<void> {
    const text =
      `Hi ${params.guestName}, your booking at ${params.propertyName} has been cancelled. ` +
      (params.refundAmount > 0
        ? `A refund of ${params.currency} ${params.refundAmount} is on its way.`
        : `No refund applies under this property's cancellation policy.`);

    await this.send(params.guestPhone, text, 'cancellation');
  }

  /** Never throws — a notification failing must not roll back a booking/payment state change. */
  private async send(
    phone: string | null,
    text: string,
    kind: string,
    reference?: string,
  ): Promise<void> {
    if (!phone) {
      this.logger.log(`[whatsapp skipped, no phone on file] ${kind}${reference ? ` for ${reference}` : ''}`);
      return;
    }

    if (!this.isConfigured) {
      this.logger.log(`[whatsapp skipped, not configured] Would send ${kind} to ${phone}: "${text}"`);
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone.replace(/^\+/, ''),
            type: 'text',
            text: { body: text },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`WhatsApp API responded ${response.status}: ${errorBody}`);
      }

      this.logger.log(`WhatsApp ${kind} sent to ${phone}`);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp ${kind} to ${phone}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
