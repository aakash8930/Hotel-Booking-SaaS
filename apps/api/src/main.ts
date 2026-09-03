import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe — validates all DTOs automatically
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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
