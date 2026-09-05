import { Module } from '@nestjs/common';
import { RevenueInsightsController } from './revenue-insights.controller';
import { RevenueInsightsService } from './revenue-insights.service';

@Module({ controllers: [RevenueInsightsController], providers: [RevenueInsightsService] })
export class RevenueInsightsModule {}
