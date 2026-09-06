import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { MetricsService } from './metrics.service';

@Injectable()
export class ObservabilityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    const requestId = incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming) ? incoming : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      this.metrics.record(req.originalUrl,res.statusCode,durationMs);
      process.stdout.write(JSON.stringify({
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      }) + '\n');
    });

    next();
  }
}
