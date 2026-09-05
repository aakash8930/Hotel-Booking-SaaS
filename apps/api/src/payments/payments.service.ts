/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Payments Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Manages the payment lifecycle:
 *   1. Initiate — create payment record, get PhonePe redirect URL
 *   2. Verify — check payment status with PhonePe
 *   3. Webhook — handle PhonePe payment confirmation (idempotent)
 *
 * The critical piece is the webhook handler, which MUST be idempotent:
 *   - PhonePe may deliver the same webhook multiple times
 *   - We use the UNIQUE constraint on provider_txn_id + upsert-then-check
 *   - Only the FIRST successful processing triggers booking state transition
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@hbs/prisma';
import { BookingStatus, PaymentStatus } from '@hbs/prisma';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import type { PaymentMethod } from '@hbs/prisma';
import { assertCanTransition, canTransition } from '../common/booking-state';
import { PhonePeService } from './phonepe.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { RealtimeService } from '../realtime/realtime.service';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly phonepe: PhonePeService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
    private readonly realtime: RealtimeService,
    private readonly invoices: InvoicesService,
  ) {}

  /**
   * Initiate payment for a booking.
   *
   * Flow:
   *   1. Validate booking exists and is in PENDING state
   *   2. Transition booking: PENDING → CONFIRMED
   *   3. Create payment record in INITIATED status
   *   4. Call PhonePe to get redirect URL
   *   5. Return redirect URL to frontend
   */
  async initiatePayment(bookingId: string, method: PaymentMethod = 'UPI' as PaymentMethod, accessToken?: string) {
    await this.assertBookingAccess(bookingId, accessToken);
    // ── Fetch booking ──────────────────────────────────────────────────
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { select: { basePrice: true } },
        guest: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // ── Validate state transition ──────────────────────────────────────
    assertCanTransition(booking.status, BookingStatus.CONFIRMED);

    // Check hold hasn't expired
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.EXPIRED },
      });
      throw new BadRequestException(
        'Booking hold has expired. Please create a new booking.',
      );
    }

    // ── Generate transaction ID ────────────────────────────────────────
    const transactionId = `HBS-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const amountPaise = Math.round(Number(booking.totalPrice) * 100); // ₹ to paise

    // ── Transition booking: PENDING → CONFIRMED ────────────────────────
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        holdExpiresAt: null, // No longer needed
      },
    });

    this.logger.log(
      `Booking ${bookingId} transitioned: PENDING → CONFIRMED (payment initiated)`,
    );

    // ── Call PhonePe to initiate payment ───────────────────────────────
    const appUrl = this.config.get<string>(
      'NEXT_PUBLIC_APP_URL',
      'http://localhost:3000',
    );
    const apiUrl = this.config.get<string>(
      'NEXT_PUBLIC_API_URL',
      'http://localhost:4000',
    );

    // ── Create payment record ──────────────────────────────────────────
    // Created before the PhonePe call so its id is known and can be
    // embedded in the callback URL — the frontend needs `paymentId` to
    // call GET /payments/verify/:paymentId once the guest returns.
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        currency: booking.currency,
        status: PaymentStatus.INITIATED,
        method,
        provider: 'phonepe',
        providerTxnId: transactionId,
      },
    });

    let phonepeResponse;
    try {
      phonepeResponse = await this.phonepe.initiatePayment({
      transactionId,
      amount: amountPaise,
      callbackUrl: `${appUrl}/booking/${bookingId}/payment-callback?paymentId=${payment.id}`,
      webhookUrl: `${apiUrl}/api/v1/payments/webhook/phonepe`,
      guestName: booking.guest.name,
      guestEmail: booking.guest.email,
      method,
      ...(booking.guest.phone ? { guestPhone: booking.guest.phone } : {}),
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, completedAt: new Date() } }),
        prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Payment provider initiation failed' } }),
      ]);
      this.logger.error(
        `Payment provider initiation failed for booking ${bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Payment provider is temporarily unavailable. Please try again.');
    }

    this.logger.log(
      `Payment initiated: ${payment.id} | txn: ${transactionId} | ₹${booking.totalPrice}`,
    );

    return {
      paymentId: payment.id,
      transactionId,
      redirectUrl: phonepeResponse.redirectUrl,
      amount: Number(booking.totalPrice),
      currency: booking.currency,
    };
  }

  /** Verify the opaque anonymous-booking capability token. */
  private async assertBookingAccess(bookingId: string, accessToken?: string): Promise<void> {
    if (!accessToken) throw new BadRequestException('Booking access token required');
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { accessTokenHash: true } });
    if (!booking?.accessTokenHash) throw new BadRequestException('Invalid booking access token');
    const supplied = Buffer.from(createHash('sha256').update(accessToken).digest('hex'));
    const stored = Buffer.from(booking.accessTokenHash);
    if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
      throw new BadRequestException('Invalid booking access token');
    }
  }

  /**
   * Handle PhonePe webhook — THE CRITICAL IDEMPOTENT HANDLER.
   *
   * This is the function that must be correct on the first pass.
   * PhonePe may deliver the same webhook multiple times.
   *
   * Idempotency strategy:
   *   1. Look up payment by provider_txn_id
   *   2. If payment already shows SUCCESS → return 200 immediately (no-op)
   *   3. If payment is INITIATED → process the state transition
   *   4. The UNIQUE constraint on provider_txn_id prevents duplicate records
   *   5. Even under concurrent delivery, only one request will see INITIATED
   *
   * @returns { processed: boolean, message: string }
   */
  async handleWebhook(params: {
    transactionId: string;
    success: boolean;
    amount?: number;
  }): Promise<{ processed: boolean; message: string }> {
    const { transactionId, success } = params;

    // ── Step 1: Look up payment by transaction ID ─────────────────────
    const payment = await prisma.payment.findUnique({
      where: { providerTxnId: transactionId },
      include: {
        booking: { select: { id: true, status: true } },
      },
    });

    if (payment?.amount && params.amount != null) {
      const receivedAmount = Number(params.amount);
      const expectedPaise = Math.round(Number(payment.amount) * 100);
      if (receivedAmount !== expectedPaise) {
        this.logger.error(
          `Webhook amount mismatch for ${transactionId}: expected ${expectedPaise} paise, received ${receivedAmount}`,
        );
        return { processed: false, message: 'Payment amount mismatch' };
      }
    }

    if (!payment) {
      this.logger.warn(`Webhook received for unknown transaction: ${transactionId}`);
      return { processed: false, message: 'Payment not found' };
    }

    // ── Step 2: Check if already processed (idempotency guard) ─────────
    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.log(
        `Webhook duplicate ignored: ${transactionId} already processed (payment: ${payment.id})`,
      );
      return {
        processed: false,
        message: 'Payment already processed (idempotent)',
      };
    }

    if (payment.status === PaymentStatus.FAILED) {
      this.logger.log(
        `Webhook ignored: ${transactionId} already marked as failed`,
      );
      return {
        processed: false,
        message: 'Payment already failed',
      };
    }

    // ── Step 3: Process the state transition ───────────────────────────
    if (success) {
      return this.processSuccessfulPayment(payment.id, payment.bookingId, payment.booking.status);
    } else {
      return this.processFailedPayment(payment.id, payment.bookingId, payment.booking.status);
    }
  }

  /**
   * Process a successful payment — transition payment to SUCCESS, booking to PAID.
   *
   * Uses a database transaction to ensure atomicity:
   *   - Payment status: INITIATED → SUCCESS
   *   - Booking status: CONFIRMED → PAID
   *
   * The state machine validates both transitions before executing.
   */
  private async processSuccessfulPayment(
    paymentId: string,
    bookingId: string,
    currentBookingStatus: BookingStatus,
  ): Promise<{ processed: boolean; message: string }> {
    // ── Validate state transitions ─────────────────────────────────────
    assertCanTransition(currentBookingStatus, BookingStatus.PAID);

    // ── Atomic update: payment + booking ───────────────────────────────
    // Using $transaction ensures both updates succeed or both fail.
    // The UNIQUE constraint on provider_txn_id prevents race conditions.
    try {
      await prisma.$transaction(async (tx) => {
        // Re-fetch payment inside transaction to check current state
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
        });

        if (!payment || payment.status !== PaymentStatus.INITIATED) {
          // Another concurrent request already processed this
          throw new ConflictException('Payment already processed');
        }

        // Update payment: INITIATED → SUCCESS
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.SUCCESS,
            completedAt: new Date(),
          },
        });

        // Update booking: CONFIRMED → PAID
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.PAID },
        });
      });

      this.logger.log(
        `Payment SUCCESS: ${paymentId} | Booking ${bookingId} → PAID`,
      );

      void this.invoices.generateForBooking(bookingId).catch((error) => {
        this.logger.error(
          `Failed to generate invoice for booking ${bookingId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
      void this.sendConfirmationNotifications(bookingId);

      return { processed: true, message: 'Payment successful, booking confirmed' };
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.log(`Concurrent webhook handled idempotently: ${paymentId}`);
        return { processed: false, message: 'Already processed (concurrent)' };
      }
      throw error;
    }
  }

  /**
   * Fetch booking details and send the confirmation email + WhatsApp
   * message.
   *
   * Called after a payment is confirmed successful. Never throws — a
   * notification failing to send must not affect the payment/booking
   * state, which has already been committed by this point. Email and
   * WhatsApp are independent — one failing doesn't block the other.
   */
  private async sendConfirmationNotifications(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          guest: { select: { name: true, email: true, phone: true } },
          room: {
            select: {
              name: true,
              currency: true,
              property: { select: { name: true } },
            },
          },
        },
      });

      if (!booking) return;

      const checkIn = booking.checkIn.toISOString().split('T')[0]!;
      const checkOut = booking.checkOut.toISOString().split('T')[0]!;

      await Promise.allSettled([
        this.email.sendBookingConfirmation({
          guestEmail: booking.guest.email,
          guestName: booking.guest.name,
          propertyName: booking.room.property.name,
          roomName: booking.room.name,
          checkIn,
          checkOut,
          totalPrice: Number(booking.totalPrice),
          currency: booking.room.currency,
          bookingId: booking.id,
        }),
        this.whatsapp.sendBookingConfirmation({
          guestPhone: booking.guest.phone,
          guestName: booking.guest.name,
          propertyName: booking.room.property.name,
          checkIn,
          checkOut,
          totalPrice: Number(booking.totalPrice),
          currency: booking.room.currency,
          bookingId: booking.id,
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to prepare confirmation notifications for booking ${bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Process a failed payment — transition payment to FAILED, booking to CANCELLED.
   *
   * Fail-fast approach: if payment fails, cancel the booking immediately
   * rather than waiting for the hold timer to expire.
   */
  private async processFailedPayment(
    paymentId: string,
    bookingId: string,
    currentBookingStatus: BookingStatus,
  ): Promise<{ processed: boolean; message: string }> {
    // ── Validate state transition ──────────────────────────────────────
    if (!canTransition(currentBookingStatus, BookingStatus.CANCELLED)) {
      this.logger.warn(
        `Cannot cancel booking ${bookingId} from status ${currentBookingStatus}`,
      );
      return { processed: false, message: 'Invalid state for cancellation' };
    }

    // ── Atomic update ──────────────────────────────────────────────────
    try {
      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
        });

        if (!payment || payment.status !== PaymentStatus.INITIATED) {
          throw new ConflictException('Payment already processed');
        }

        // Update payment: INITIATED → FAILED
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            completedAt: new Date(),
          },
        });

        // Update booking: CONFIRMED → CANCELLED (fail-fast)
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: 'Payment failed',
          },
        });
      });

      this.logger.log(
        `Payment FAILED: ${paymentId} | Booking ${bookingId} → CANCELLED`,
      );

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { room: { select: { id: true, propertyId: true } } },
      });
      if (booking) {
        void this.realtime.publish('room.released', booking.room.id, booking.room.propertyId, {
          bookingId,
          reason: 'payment_failed',
        });
      }

      return { processed: true, message: 'Payment failed, booking cancelled' };
    } catch (error) {
      if (error instanceof ConflictException) {
        return { processed: false, message: 'Already processed (concurrent)' };
      }
      throw error;
    }
  }

  /**
   * Verify payment status with PhonePe and update our records.
   * Called by the frontend after redirect back from PhonePe.
   */
  async verifyPayment(paymentId: string, accessToken?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.assertBookingAccess(payment.bookingId, accessToken);

    // If already processed, return current state
    if (payment.status !== PaymentStatus.INITIATED) {
      return {
        paymentId: payment.id,
        status: payment.status,
        bookingStatus: payment.booking.status,
      };
    }

    // ── Verify with PhonePe ────────────────────────────────────────────
    const phonepeStatus = await this.phonepe.verifyPayment(payment.providerTxnId!);

    if (phonepeStatus.success) {
      const result = await this.processSuccessfulPayment(
        payment.id,
        payment.bookingId,
        payment.booking.status,
      );
      return {
        paymentId: payment.id,
        status: result.processed ? PaymentStatus.SUCCESS : payment.status,
        bookingStatus: result.processed ? BookingStatus.PAID : payment.booking.status,
      };
    }

    return {
      paymentId: payment.id,
      status: PaymentStatus.INITIATED,
      bookingStatus: payment.booking.status,
    };
  }

  /**
   * Refund the most recent successful payment for a booking.
   *
   * Called by BookingsService.cancel() once it's computed a non-zero
   * refund from the property's cancellation policy. A no-op (returns null)
   * if there's no successful payment to refund — happens when a PENDING
   * hold gets cancelled before any payment ever succeeded.
   */
  async refundPayment(bookingId: string, refundAmount: number) {
    const payment = await prisma.payment.findFirst({
      where: { bookingId, status: PaymentStatus.SUCCESS },
      orderBy: { completedAt: 'desc' },
    });

    if (!payment) {
      return null;
    }

    const refundTransactionId = `RFD-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const amountPaise = Math.round(refundAmount * 100);

    const refundResult = await this.phonepe.initiateRefund({
      originalTransactionId: payment.providerTxnId!,
      refundTransactionId,
      amount: amountPaise,
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAmount: refundAmount,
        refundTxnId: refundResult.refundTransactionId,
        refundedAt: new Date(),
      },
    });

    this.logger.log(
      `Refund ${refundResult.success ? 'confirmed' : 'FAILED'}: ${refundTransactionId} | ` +
        `booking ${bookingId} | ₹${refundAmount}`,
    );

    return updated;
  }

  /**
   * Manually transition a booking state (admin endpoint).
   * Uses the state machine to validate the transition.
   */
  async transitionBooking(
    bookingId: string,
    targetStatus: BookingStatus,
    reason?: string,
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // ── Validate transition ────────────────────────────────────────────
    assertCanTransition(booking.status, targetStatus);

    // ── Perform transition ─────────────────────────────────────────────
    const updateData: any = { status: targetStatus };

    if (targetStatus === BookingStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason ?? 'Manual cancellation';
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    this.logger.log(
      `Booking ${bookingId} transitioned: ${booking.status} → ${targetStatus}${reason ? ` (${reason})` : ''}`,
    );

    return updated;
  }
}
