/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Realtime Event Publisher
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Publishes room availability events to Redis pub/sub. The Go WebSocket
 * service (apps/realtime) subscribes to the same channel and broadcasts
 * to any browser tab currently viewing that property.
 *
 *   NestJS API → Redis pub/sub → Go realtime service → WebSocket clients
 *
 * If Redis is unreachable, publishing degrades to a no-op log rather than
 * failing the request — live availability is a nice-to-have, never a
 * reason to fail a booking.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const AVAILABILITY_CHANNEL = 'hbs:availability';

export type AvailabilityEventType = 'room.held' | 'room.released';

export interface AvailabilityEvent {
  type: AvailabilityEventType;
  roomId: string;
  propertyId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured — live availability events will not be published.',
      );
      this.client = null;
      return;
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis publisher error: ${err.message}`);
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis publisher failed to connect: ${err.message}`);
    });
  }

  async publish(
    type: AvailabilityEventType,
    roomId: string,
    propertyId: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    if (!this.client) return;

    const event: AvailabilityEvent = {
      type,
      roomId,
      propertyId,
      payload,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.client.publish(AVAILABILITY_CHANNEL, JSON.stringify(event));
    } catch (error) {
      this.logger.warn(
        `Failed to publish availability event: ${(error as Error).message}`,
      );
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
