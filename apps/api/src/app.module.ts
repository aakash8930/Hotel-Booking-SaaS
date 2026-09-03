import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { SearchModule } from './search/search.module';
import { UploadModule } from './upload/upload.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './common/prisma.module';

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

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    HealthModule,
    PropertiesModule,
    RoomsModule,
    BookingsModule,
    SearchModule,
    UploadModule,
    PaymentsModule,
  ],
})
export class AppModule {}
