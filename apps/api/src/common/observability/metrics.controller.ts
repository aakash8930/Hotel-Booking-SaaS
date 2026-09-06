import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { metricsSnapshotToPrometheus } from './metrics.format';

@Controller('internal/metrics')
export class MetricsController {
 constructor(private readonly metrics: MetricsService) {}
 @Get() snapshot(){ return this.metrics.snapshot(); }
 @Get('prometheus')
 @Header('Content-Type','text/plain; version=0.0.4')
 prometheus(){ return metricsSnapshotToPrometheus(this.metrics.snapshot()); }
}