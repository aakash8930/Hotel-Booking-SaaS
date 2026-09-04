package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
)

// AvailabilityChannel must match RealtimeService's AVAILABILITY_CHANNEL
// constant on the NestJS side (apps/api/src/realtime/realtime.service.ts).
const AvailabilityChannel = "hbs:availability"

// AvailabilityEvent mirrors the JSON shape NestJS publishes.
type AvailabilityEvent struct {
	Type       string                 `json:"type"`
	RoomID     string                 `json:"roomId"`
	PropertyID string                 `json:"propertyId"`
	Payload    map[string]interface{} `json:"payload"`
	Timestamp  string                 `json:"timestamp"`
}

// subscribeAvailability connects to Redis and forwards every message on
// the availability channel to the hub as a targeted broadcast, scoped to
// the event's PropertyID. Runs until ctx is cancelled; reconnects are not
// attempted here — if Redis is down, live availability degrades silently
// rather than taking the whole service down (booking still works via the
// REST API regardless of this pipeline's health).
func subscribeAvailability(ctx context.Context, hub *Hub, redisURL string) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("Invalid REDIS_URL, live availability disabled: %v", err)
		return
	}

	client := redis.NewClient(opts)
	defer client.Close()

	sub := client.Subscribe(ctx, AvailabilityChannel)
	defer sub.Close()

	if _, err := sub.Receive(ctx); err != nil {
		log.Printf("Failed to subscribe to %s, live availability disabled: %v", AvailabilityChannel, err)
		return
	}

	log.Printf("📡 Subscribed to Redis channel: %s", AvailabilityChannel)

	ch := sub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}

			var event AvailabilityEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("Failed to parse availability event: %v", err)
				continue
			}

			hub.BroadcastToProperty(event.PropertyID, []byte(msg.Payload))
			log.Printf("Broadcast %s for room %s (property %s)", event.Type, event.RoomID, event.PropertyID)
		}
	}
}
