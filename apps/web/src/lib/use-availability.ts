'use client';

import { useEffect, useState } from 'react';

interface AvailabilityEvent {
  type: 'room.held' | 'room.released';
  roomId: string;
  propertyId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';

/**
 * Live room availability for a property, via the Go realtime service.
 *
 * NestJS publishes room.held/room.released to Redis whenever a booking is
 * created, cancelled, or its hold expires; the Go service forwards those
 * events over WebSocket to every browser subscribed to this property.
 * Returns the set of room IDs another guest has *just* claimed, so the UI
 * can reflect it without a page refresh — the "two tabs" scenario from
 * the roadmap's exit criteria.
 *
 * Fails silently: if the realtime service is down, this simply never
 * updates. Booking itself is unaffected either way — the database's
 * EXCLUDE constraint is the actual source of truth, this is only a
 * same-second UI convenience on top of it.
 */
export function useAvailability(propertyId: string | undefined) {
  const [justHeldRoomIds, setJustHeldRoomIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!propertyId) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_URL}/ws`);
    } catch {
      return;
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'subscribe', propertyId }));
    };

    ws.onmessage = (event) => {
      let parsed: AvailabilityEvent;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      setJustHeldRoomIds((prev) => {
        const next = new Set(prev);
        if (parsed.type === 'room.held') {
          next.add(parsed.roomId);
        } else if (parsed.type === 'room.released') {
          next.delete(parsed.roomId);
        }
        return next;
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'unsubscribe', propertyId }));
      }
      ws.close();
    };
  }, [propertyId]);

  return justHeldRoomIds;
}
