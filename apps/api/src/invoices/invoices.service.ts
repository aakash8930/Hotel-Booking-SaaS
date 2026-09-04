import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import { calculateGst, ACCOMMODATION_SAC_CODE } from './gst';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  /**
   * Generate the GST invoice for a booking, if one doesn't already exist.
   * Idempotent — safe to call more than once for the same booking (e.g.
   * from both the payment-success path and an on-demand fetch).
   */
  async generateForBooking(bookingId: string) {
    const existing = await prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) return existing;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { select: { property: { select: { state: true, host: { select: { gstin: true } } } } } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const nights = Math.ceil(
      (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    const gst = calculateGst({
      totalPrice: Number(booking.totalPrice),
      nights,
      propertyState: booking.room.property.state,
      hostGstin: booking.room.property.host.gstin,
    });

    const invoiceNumber = await this.nextInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        bookingId,
        invoiceNumber,
        hostGstin: booking.room.property.host.gstin,
        placeOfSupply: booking.room.property.state,
        sacCode: ACCOMMODATION_SAC_CODE,
        taxableAmount: gst.taxableAmount,
        gstRate: gst.gstRate,
        cgstAmount: gst.cgstAmount,
        sgstAmount: gst.sgstAmount,
        igstAmount: gst.igstAmount,
        totalAmount: gst.totalAmount,
      },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} issued for booking ${bookingId}`);
    return invoice;
  }

  async getForBooking(bookingId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            checkIn: true,
            checkOut: true,
            guests: true,
            currency: true,
            guest: { select: { name: true, email: true } },
            room: {
              select: {
                name: true,
                property: {
                  select: {
                    name: true,
                    address: true,
                    city: true,
                    state: true,
                    pincode: true,
                    host: { select: { name: true, businessName: true, gstin: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('No invoice has been issued for this booking yet');
    }

    return invoice;
  }

  /** Atomic per-calendar-year sequence — a single-row UPDATE is atomic in Postgres without needing a transaction. */
  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await prisma.invoiceSequence.upsert({
      where: { year },
      create: { year, value: 1 },
      update: { value: { increment: 1 } },
    });

    return `INV-${year}-${String(seq.value).padStart(6, '0')}`;
  }
}
