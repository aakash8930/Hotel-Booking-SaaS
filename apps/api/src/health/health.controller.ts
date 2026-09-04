import { Controller, Get } from '@nestjs/common';
import { prisma } from '@hbs/prisma';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      success: true,
      data: {
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          api: 'up',
          database: dbStatus,
        },
      },
    };
  }
}
