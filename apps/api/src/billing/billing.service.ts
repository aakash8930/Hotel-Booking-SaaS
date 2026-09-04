/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Billing Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Lets a host choose between two pricing models:
 *   - COMMISSION: platform takes a % of each booking (default, zero cost
 *     to a host with zero bookings — the right default for an unproven pilot)
 *   - SUBSCRIPTION: host pays a flat recurring fee, 0% commission
 *
 * This computes and displays the platform's fee under either plan — it does
 * NOT collect it. There's no host payout system yet (guest payments all
 * flow through one central PhonePe merchant account, not per-host), so
 * automated commission deduction or subscription billing is real
 * infrastructure that doesn't exist. Building it now would be scope creep
 * ahead of an actual paying host — this is deliberately deferred per the
 * roadmap's own Phase 8 philosophy: upgrade in response to a real signal
 * (an actual host asking to get paid), not a guess.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import { BillingPlan } from '@hbs/prisma';

@Injectable()
export class BillingService {
  async getPlan(hostId: string) {
    const host = await prisma.host.findUnique({
      where: { id: hostId },
      select: {
        billingPlan: true,
        commissionRate: true,
        subscriptionFee: true,
        billingPlanSetAt: true,
        gstin: true,
      },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    return host;
  }

  async setGstin(hostId: string, gstin: string | null) {
    return prisma.host.update({
      where: { id: hostId },
      data: { gstin },
      select: { gstin: true },
    });
  }

  async setPlan(hostId: string, billingPlan: BillingPlan) {
    const host = await prisma.host.update({
      where: { id: hostId },
      data: { billingPlan, billingPlanSetAt: new Date() },
      select: {
        billingPlan: true,
        commissionRate: true,
        subscriptionFee: true,
        billingPlanSetAt: true,
      },
    });

    return host;
  }
}
