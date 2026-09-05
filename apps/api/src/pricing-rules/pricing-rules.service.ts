import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@hbs/prisma';

@Injectable()
export class PricingRulesService {
  async list(hostId: string, propertyId: string) {
    await this.assertProperty(hostId, propertyId);
    return prisma.pricingRule.findMany({ where: { propertyId }, orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] });
  }

  async create(hostId: string, propertyId: string, input: {
    name: string; adjustment: number; adjustmentType: 'PERCENT' | 'FIXED';
    minDemand?: number; maxDemand?: number; startDate?: string; endDate?: string;
  }) {
    await this.assertProperty(hostId, propertyId);
    if (!input.name?.trim()) throw new Error('Rule name is required');
    if (input.adjustmentType === 'PERCENT' && (input.adjustment < -100 || input.adjustment > 500)) throw new Error('Percent adjustment must be between -100 and 500');
    if (input.minDemand != null && (input.minDemand < 0 || input.minDemand > 100)) throw new Error('minDemand must be 0-100');
    if (input.maxDemand != null && (input.maxDemand < 0 || input.maxDemand > 100)) throw new Error('maxDemand must be 0-100');
    if (input.minDemand != null && input.maxDemand != null && input.minDemand > input.maxDemand) throw new Error('minDemand cannot exceed maxDemand');

    return prisma.pricingRule.create({
      data: {
        propertyId, name: input.name.trim(), adjustment: new Prisma.Decimal(input.adjustment),
        adjustmentType: input.adjustmentType, minDemand: input.minDemand, maxDemand: input.maxDemand,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  }

  async setActive(hostId: string, id: string, isActive: boolean) {
    const rule = await prisma.pricingRule.findFirst({ where: { id, property: { hostId } } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return prisma.pricingRule.update({ where: { id }, data: { isActive } });
  }

  private async assertProperty(hostId: string, propertyId: string) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, hostId }, select: { id: true } });
    if (!property) throw new NotFoundException('Property not found');
  }
}
