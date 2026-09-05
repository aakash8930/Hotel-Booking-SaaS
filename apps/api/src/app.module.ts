import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { SearchModule } from './search/search.module';
import { UploadModule } from './upload/upload.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './common/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AiModule } from './ai/ai.module';
import { BillingModule } from './billing/billing.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PayoutsModule } from './payouts/payouts.module';
import { AdminModule } from './admin/admin.module';
import { InvoicesModule } from './invoices/invoices.module';
import { RevenueInsightsModule } from './revenue-insights/revenue-insights.module';
import { PricingRulesModule } from './pricing-rules/pricing-rules.module';
import { PricingCalendarModule } from './pricing-calendar/pricing-calendar.module';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Rate limiting — 60 requests per minute by default
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    // Powers the @Cron job that auto-expires soft-holds
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,
    RealtimeModule,

    // Feature modules
    AuthModule,
    HealthModule,
    PropertiesModule,
    RoomsModule,
    BookingsModule,
    SearchModule,
    UploadModule,
    PaymentsModule,
    AiModule,
    BillingModule,
    ReviewsModule,
    PayoutsModule,
    AdminModule,
    InvoicesModule,
    RevenueInsightsModule,
    PricingRulesModule,
    PricingCalendarModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
