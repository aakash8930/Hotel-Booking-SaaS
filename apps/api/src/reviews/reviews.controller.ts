import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(GuestAuthGuard)
  async create(@CurrentUser('sub') guestId: string, @Body() dto: CreateReviewDto) {
    const review = await this.reviewsService.create(guestId, dto);
    return { success: true, data: review };
  }

  @Get('property/:propertyId')
  async findAllForProperty(
    @Param('propertyId') propertyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.reviewsService.findAllForProperty(
      propertyId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
    return { success: true, data };
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GuestAuthGuard)
  async report(@Param('id') id: string) {
    const review = await this.reviewsService.report(id);
    return { success: true, data: review };
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async reply(
    @CurrentUser('sub') hostId: string,
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    const review = await this.reviewsService.reply(hostId, id, dto.reply);
    return { success: true, data: review };
  }
}
