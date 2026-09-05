/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Payments Controller
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Exposes payment endpoints:
 *   POST /payments/initiate          — Start payment flow (guest)
 *   GET  /payments/verify/:paymentId — Check payment status (guest)
 *   POST /payments/webhook/phonepe   — PhonePe webhook (external)
 *   POST /payments/transition        — Admin state transition (host)
 *
 * The webhook endpoint is the most critical — must be idempotent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PhonePeService } from './phonepe.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingStatus, PaymentMethod } from '@hbs/prisma';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly phonepe: PhonePeService,
  ) {}

  /**
   * POST /payments/initiate
   *
   * Start the payment flow for a booking.
   * Returns a redirect URL to send the guest to PhonePe.
   */
  @Post('initiate')
  async initiatePayment(@Body() body: InitiatePaymentDto, @Headers('x-booking-access-token') accessToken?: string) {
    const result = await this.paymentsService.initiatePayment(
      body.bookingId,
      (body.method as PaymentMethod) ?? undefined,
      accessToken,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /payments/verify/:paymentId
   *
   * Verify payment status after redirect from PhonePe.
   * Frontend calls this after the guest returns from payment page.
   */
  @Get('verify/:paymentId')
  async verifyPayment(@Param('paymentId') paymentId: string, @Headers('x-booking-access-token') accessToken?: string) {
    const result = await this.paymentsService.verifyPayment(paymentId, accessToken);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /payments/webhook/phonepe
   *
   * PhonePe webhook endpoint — receives payment confirmation.
   *
   * THIS IS THE CRITICAL IDEMPOTENT HANDLER.
   *
   * PhonePe may send the same webhook multiple times.
   * We must process it exactly once.
   *
   * Security: Validate X-VERIFY header signature.
   */
  @Post('webhook/phonepe')
  @HttpCode(HttpStatus.OK)
  async handlePhonePeWebhook(
    @Body() body: any,
    @Headers('x-verify') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    // ── Validate webhook signature ─────────────────────────────────────
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    const isValid = this.phonepe.validateWebhookSignature(rawBody, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // ── Extract transaction details ────────────────────────────────────
    // PhonePe webhook payload structure (simplified):
    const transactionId = body.transactionId || body.merchantTransactionId;
    const success = body.state === 'COMPLETED' || body.success === true;

    if (!transactionId) {
      return {
        success: false,
        message: 'Missing transactionId in webhook',
      };
    }

    // ── Process webhook (idempotent) ───────────────────────────────────
    const result = await this.paymentsService.handleWebhook({
      transactionId,
      success,
      amount: body.amount,
    });

    // Always return 200 to PhonePe (even if already processed)
    // This prevents PhonePe from retrying
    return {
      success: true,
      ...result,
    };
  }

  /**
   * POST /payments/transition
   *
   * Admin endpoint to manually transition a booking state.
   * Protected by JWT auth (host only).
   *
   * Body: { bookingId, targetStatus, reason? }
   */
  @Post('transition')
  @UseGuards(JwtAuthGuard)
  async transitionBooking(
    @Body()
    body: {
      bookingId: string;
      targetStatus: BookingStatus;
      reason?: string;
    },
  ) {
    const result = await this.paymentsService.transitionBooking(
      body.bookingId,
      body.targetStatus,
      body.reason,
    );

    return {
      success: true,
      data: result,
    };
  }
}
