import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import type { CreateReviewDto } from './dto/create-review.dto';

/** Statuses where a stay has actually happened, so a review makes sense. */
const REVIEWABLE_STATUSES = new Set(['CHECKED_OUT', 'PAID', 'CHECKED_IN']);

/**
 * Reports auto-hide a review pending admin review — a coarse community
 * signal, not abuse-proof (nothing here dedupes one guest reporting the
 * same review multiple times; a real system would track reporter identity
 * per report). Good enough at pilot stage; an admin can always unhide.
 */
const REPORT_AUTO_HIDE_THRESHOLD = 3;

@Injectable()
export class ReviewsService {
  async create(guestId: string, dto: CreateReviewDto) {
    const booking = await prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { room: { select: { propertyId: true } }, review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== guestId) {
      throw new ForbiddenException('This booking does not belong to you');
    }

    if (booking.review) {
      throw new ConflictException('This booking has already been reviewed');
    }

    const hasStayed =
      booking.status === 'CHECKED_OUT' ||
      (REVIEWABLE_STATUSES.has(booking.status) && new Date(booking.checkOut) <= new Date());

    if (!hasStayed) {
      throw new BadRequestException('You can review a stay once your check-out date has passed');
    }

    return prisma.review.create({
      data: {
        bookingId: booking.id,
        propertyId: booking.room.propertyId,
        guestId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
    });
  }

  async findAllForProperty(propertyId: string, limit = 20, offset = 0) {
    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { propertyId, hiddenAt: null },
        include: { guest: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.review.aggregate({
        where: { propertyId, hiddenAt: null },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        hostReply: r.hostReply,
        hostRepliedAt: r.hostRepliedAt,
        guestName: r.guest.name,
        createdAt: r.createdAt,
      })),
      averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
      totalReviews: aggregate._count.rating,
    };
  }

  async report(reviewId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const newCount = review.reportCount + 1;

    return prisma.review.update({
      where: { id: reviewId },
      data: {
        reportCount: newCount,
        ...(newCount >= REPORT_AUTO_HIDE_THRESHOLD && !review.hiddenAt
          ? { hiddenAt: new Date(), hiddenReason: 'Auto-hidden after multiple reports' }
          : {}),
      },
      select: { id: true, reportCount: true, hiddenAt: true },
    });
  }

  async reply(hostId: string, reviewId: string, reply: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { property: { select: { hostId: true } } },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.property.hostId !== hostId) {
      throw new ForbiddenException('You do not own this property');
    }

    return prisma.review.update({
      where: { id: reviewId },
      data: { hostReply: reply, hostRepliedAt: new Date() },
    });
  }
}
