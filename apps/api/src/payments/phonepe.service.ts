/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PhonePe Payment Gateway Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Handles PhonePe API calls:
 *   - Initiate payment (get redirect URL)
 *   - Verify payment status
 *   - Validate webhook signatures
 *
 * In test/dev mode (PHONEPE_MERCHANT_ID not set), returns mock responses
 * so the full flow can be tested without real PhonePe credentials.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type { PaymentMethod } from '@hbs/prisma';

/** Maps our PaymentMethod enum to PhonePe's paymentInstrument.type values. */
const INSTRUMENT_TYPE: Record<PaymentMethod, string> = {
  UPI: 'UPI_INTENT',
  CARD: 'CARD',
  NETBANKING: 'NET_BANKING',
  WALLET: 'WALLET',
};

export interface PhonePeInitiateResponse {
  redirectUrl: string;
  transactionId: string;
  merchantId: string;
}

export interface PhonePeStatusResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  state: 'COMPLETED' | 'FAILED' | 'PENDING';
}

export interface PhonePeRefundResponse {
  success: boolean;
  refundTransactionId: string;
  state: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

@Injectable()
export class PhonePeService {
  private readonly logger = new Logger(PhonePeService.name);
  private readonly isSandbox: boolean;

  constructor(private readonly config: ConfigService) {
    this.isSandbox = !this.config.get<string>('PHONEPE_MERCHANT_ID');
    if (this.isSandbox) {
      this.logger.warn(
        'PhonePe running in SANDBOX mode (no credentials). ' +
        'Set PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX for production.',
      );
    }
  }

  /**
   * Initiate a payment with PhonePe.
   *
   * Returns a redirect URL that the guest should be sent to for UPI payment.
   * In sandbox mode, returns a mock URL that simulates success.
   */
  async initiatePayment(params: {
    transactionId: string;
    amount: number; // in paise (₹1 = 100 paise)
    callbackUrl: string;
    webhookUrl: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    method?: PaymentMethod;
  }): Promise<PhonePeInitiateResponse> {
    const merchantId = this.config.get<string>('PHONEPE_MERCHANT_ID', 'TEST_MERCHANT');
    const method = params.method ?? ('UPI' as PaymentMethod);

    if (this.isSandbox) {
      // Sandbox mode — return a mock redirect URL. callbackUrl may already
      // carry its own query string (e.g. ?paymentId=...), so append with
      // the correct separator instead of assuming a bare URL.
      this.logger.log(
        `[SANDBOX] Payment initiated: ${params.transactionId} via ${method} (₹${params.amount / 100})`,
      );
      const separator = params.callbackUrl.includes('?') ? '&' : '?';
      return {
        redirectUrl: `${params.callbackUrl}${separator}transactionId=${params.transactionId}&status=SUCCESS`,
        transactionId: params.transactionId,
        merchantId,
      };
    }

    // ── Real PhonePe API call ────────────────────────────────────────
    const saltKey = this.config.get<string>('PHONEPE_SALT_KEY', '');
    const saltIndex = this.config.get<string>('PHONEPE_SALT_INDEX', '1');
    const baseUrl = this.config.get<string>(
      'PHONEPE_BASE_URL',
      'https://api.phonepe.com/apis/hermes',
    );

    const payload = {
      merchantId,
      merchantTransactionId: params.transactionId,
      merchantUserId: params.guestEmail,
      amount: params.amount,
      redirectUrl: params.callbackUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: params.webhookUrl,
      paymentInstrument: { type: INSTRUMENT_TYPE[method] },
    };

    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(
      `${payloadStr}/pg/v1/pay${saltKey}`,
      saltIndex,
    );

    try {
      const response = await fetch(`${baseUrl}/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({ request: payloadStr }),
      });

      const data = await response.json() as any;

      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return {
          redirectUrl: data.data.instrumentResponse.redirectInfo.url,
          transactionId: params.transactionId,
          merchantId,
        };
      }

      throw new Error(`PhonePe API error: ${JSON.stringify(data)}`);
    } catch (error) {
      this.logger.error(`PhonePe initiate failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Verify payment status with PhonePe.
   */
  async verifyPayment(transactionId: string): Promise<PhonePeStatusResponse> {
    const merchantId = this.config.get<string>('PHONEPE_MERCHANT_ID', 'TEST_MERCHANT');

    if (this.isSandbox) {
      // Sandbox mode — simulate successful payment
      this.logger.log(`[SANDBOX] Payment verified: ${transactionId}`);
      return {
        success: true,
        transactionId,
        amount: 0, // Will be looked up from our DB
        state: 'COMPLETED',
      };
    }

    const saltKey = this.config.get<string>('PHONEPE_SALT_KEY', '');
    const saltIndex = this.config.get<string>('PHONEPE_SALT_INDEX', '1');
    const baseUrl = this.config.get<string>(
      'PHONEPE_BASE_URL',
      'https://api.phonepe.com/apis/hermes',
    );

    const path = `/pg/v1/status/${merchantId}/${transactionId}`;
    const checksum = this.generateChecksum(`${path}${saltKey}`, saltIndex);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': merchantId,
        },
      });

      const data = await response.json() as any;

      return {
        success: data.success && data.data?.state === 'COMPLETED',
        transactionId,
        amount: data.data?.amount ?? 0,
        state: data.data?.state ?? 'PENDING',
      };
    } catch (error) {
      this.logger.error(`PhonePe verify failed: ${(error as Error).message}`);
      return {
        success: false,
        transactionId,
        amount: 0,
        state: 'FAILED',
      };
    }
  }

  /**
   * Initiate a refund with PhonePe for a previously successful transaction.
   *
   * Real PhonePe refunds are async — CONFIRMED doesn't land immediately,
   * PhonePe settles it and notifies via webhook (not implemented here,
   * matching the rest of this project's pilot-stage scope: the refund
   * ledger entry — Payment.refundedAmount/refundTxnId — is what's
   * authoritative for this app, same as PhonePe's real behavior where the
   * refund transaction is tracked separately from the original payment).
   */
  async initiateRefund(params: {
    originalTransactionId: string;
    refundTransactionId: string;
    amount: number; // in paise
  }): Promise<PhonePeRefundResponse> {
    const merchantId = this.config.get<string>('PHONEPE_MERCHANT_ID', 'TEST_MERCHANT');

    if (this.isSandbox) {
      this.logger.log(
        `[SANDBOX] Refund initiated: ${params.refundTransactionId} for ` +
          `${params.originalTransactionId} (₹${params.amount / 100})`,
      );
      return {
        success: true,
        refundTransactionId: params.refundTransactionId,
        state: 'CONFIRMED',
      };
    }

    const saltKey = this.config.get<string>('PHONEPE_SALT_KEY', '');
    const saltIndex = this.config.get<string>('PHONEPE_SALT_INDEX', '1');
    const baseUrl = this.config.get<string>(
      'PHONEPE_BASE_URL',
      'https://api.phonepe.com/apis/hermes',
    );

    const payload = {
      merchantId,
      merchantTransactionId: params.refundTransactionId,
      originalTransactionId: params.originalTransactionId,
      amount: params.amount,
      callbackUrl: '',
    };

    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(`${payloadStr}/pg/v1/refund${saltKey}`, saltIndex);

    try {
      const response = await fetch(`${baseUrl}/pg/v1/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({ request: payloadStr }),
      });

      const data = (await response.json()) as any;

      return {
        success: !!data.success,
        refundTransactionId: params.refundTransactionId,
        state: data.success ? 'PENDING' : 'FAILED',
      };
    } catch (error) {
      this.logger.error(`PhonePe refund failed: ${(error as Error).message}`);
      return {
        success: false,
        refundTransactionId: params.refundTransactionId,
        state: 'FAILED',
      };
    }
  }

  /**
   * Validate a PhonePe webhook signature.
   *
   * PhonePe sends a checksum in the X-VERIFY header.
   * We verify it against: SHA256(response_body + saltKey) + "###" + saltIndex
   */
  validateWebhookSignature(
    responseBody: string,
    receivedChecksum: string,
  ): boolean {
    if (this.isSandbox) {
      // In sandbox mode, accept all signatures
      return true;
    }

    const saltKey = this.config.get<string>('PHONEPE_SALT_KEY', '');
    const saltIndex = this.config.get<string>('PHONEPE_SALT_INDEX', '1');

    const expectedChecksum = this.generateChecksum(
      `${responseBody}${saltKey}`,
      saltIndex,
    );

    return expectedChecksum === receivedChecksum;
  }

  /**
   * Generate PhonePe checksum: SHA256(input) + "###" + saltIndex
   */
  private generateChecksum(input: string, saltIndex: string): string {
    const hash = createHash('sha256').update(input).digest('hex');
    return `${hash}###${saltIndex}`;
  }
}
