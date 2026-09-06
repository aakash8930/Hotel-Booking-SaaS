import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ObservabilityMiddleware } from './observability.middleware';

@Global()
@Module({})
export class ObservabilityModule implements NestModule {
 configure(consumer: MiddlewareConsumer) {
  consumer.apply(ObservabilityMiddleware).forRoutes('*');
 }
}
