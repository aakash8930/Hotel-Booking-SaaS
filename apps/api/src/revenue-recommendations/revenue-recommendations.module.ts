import { Module } from '@nestjs/common';
import { RevenueRecommendationsController } from './revenue-recommendations.controller';
import { RevenueRecommendationsService } from './revenue-recommendations.service';
@Module({controllers:[RevenueRecommendationsController],providers:[RevenueRecommendationsService]})
export class RevenueRecommendationsModule {}
