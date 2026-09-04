import { Controller, Post, Body, NotFoundException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * POST /ai/property-description
   *
   * Turns a host's rough notes into a polished listing description.
   */
  @Post('property-description')
  async generateDescription(
    @Body() body: { notes: string; propertyName?: string; city?: string },
  ) {
    const description = await this.ai.generateDescription(body);
    return { success: true, data: { description } };
  }

  /**
   * POST /ai/faq
   *
   * Answers a guest's question about a specific property, grounded in
   * that property's actual listing details.
   */
  @Post('faq')
  async answerFaq(@Body() body: { propertyId: string; question: string }) {
    const property = await prisma.property.findUnique({
      where: { id: body.propertyId },
      include: {
        rooms: { where: { isActive: true } },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const propertyContext = [
      `Name: ${property.name}`,
      `Location: ${property.city}, ${property.state}`,
      `Description: ${property.description ?? 'N/A'}`,
      `Check-in: ${property.checkInTime}`,
      `Check-out: ${property.checkOutTime}`,
      property.rules ? `House rules: ${property.rules}` : '',
      'Rooms:',
      ...property.rooms.map(
        (room) =>
          `- ${room.name}: capacity ${room.capacity}, ₹${room.basePrice}/night, amenities: ${room.amenities.join(', ') || 'none listed'}`,
      ),
    ]
      .filter(Boolean)
      .join('\n');

    const answer = await this.ai.answerFaq({ question: body.question, propertyContext });
    return { success: true, data: { answer } };
  }
}
