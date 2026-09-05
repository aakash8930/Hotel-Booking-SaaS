import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { initSentry } from './common/sentry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  initSentry(
    config.get<string>('SENTRY_DSN'),
    config.get<string>('NODE_ENV', 'development'),
  );

  // Global exception filter — normalizes all errors into { success, error } shape
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe — validates all DTOs automatically
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Basic security headers. Keep this lightweight; the reverse proxy should add HSTS in production.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS for frontend
  app.enableCors({
    origin: [
      config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      // Allow preview environments in development
      ...(process.env.NODE_ENV === 'development'
        ? [/\.e2b\.app$/]
        : []),
    ],
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API server running on http://0.0.0.0:${port}`);
  logger.log(`📋 Health check: http://0.0.0.0:${port}/api/v1/health`);
}

bootstrap();
