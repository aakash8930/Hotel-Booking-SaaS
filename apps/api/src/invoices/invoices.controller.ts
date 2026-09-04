import { Controller, Get, Param } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('bookings')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  /** Public — booking ID already acts as the access token for booking details elsewhere in this API. */
  @Get(':id/invoice')
  async getForBooking(@Param('id') id: string) {
    const invoice = await this.invoices.getForBooking(id);
    return { success: true, data: invoice };
  }
}
