import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ObservabilityMiddleware } from './observability.middleware';
import { MetricsModule } from './metrics.module';

@Global()
@Module({imports:[MetricsModule]})
export class ObservabilityModule implements NestModule {
 configure(consumer: MiddlewareConsumer) {
  consumer.apply(ObservabilityMiddleware).forRoutes('*');
 }
}
