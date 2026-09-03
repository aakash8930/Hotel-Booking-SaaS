// Package main implements a lightweight WebSocket service for real-time
// availability updates. It subscribes to Redis pub/sub channels and pushes
// booking events to connected browser clients.
//
// Architecture:
//   NestJS API → publishes events to Redis → Go service → broadcasts to WebSocket clients
//
// This is a separate service (not bolted onto NestJS) because:
//   1. Go handles thousands of concurrent WebSocket connections efficiently
//   2. Genuine concurrency use case — good for learning
//   3. Keeps the API server focused on CRUD and business logic
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ── Configuration ──────────────────────────────────────────────────────────

type Config struct {
	Port     string
	RedisURL string
}

func loadConfig() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	return Config{
		Port:     port,
		RedisURL: redisURL,
	}
}

// ── WebSocket Hub ──────────────────────────────────────────────────────────

// Hub maintains the set of active connections and broadcasts messages.
type Hub struct {
	mu          sync.RWMutex
	clients     map[*Client]bool
	register    chan *Client
	unregister  chan *Client
	broadcast   chan []byte
}

// Client represents a single WebSocket connection.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	// Room/property subscriptions for targeted broadcasts
	subscriptions map[string]bool
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 256),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client connected (%d total)", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("Client disconnected (%d total)", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client can't keep up — drop the connection
					h.mu.RUnlock()
					h.mu.Lock()
					delete(h.clients, client)
					close(client.send)
					h.mu.Unlock()
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}

// ── WebSocket Upgrader ─────────────────────────────────────────────────────

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, restrict origins. For now, allow all for dev/preview.
		return true
	},
}

// ── Event Types ────────────────────────────────────────────────────────────

type RealtimeEvent struct {
	Type       string                 `json:"type"`
	RoomID     string                 `json:"roomId"`
	PropertyID string                 `json:"propertyId"`
	Payload    map[string]interface{} `json:"payload"`
	Timestamp  string                 `json:"timestamp"`
}

// ── Handlers ───────────────────────────────────────────────────────────────

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		subscriptions: make(map[string]bool),
	}

	hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		// Parse subscription messages from the client
		var subMsg struct {
			Action     string `json:"action"`
			PropertyID string `json:"propertyId"`
		}
		if err := json.Unmarshal(message, &subMsg); err != nil {
			continue
		}

		switch subMsg.Action {
		case "subscribe":
			c.subscriptions[subMsg.PropertyID] = true
			log.Printf("Client subscribed to property: %s", subMsg.PropertyID)
		case "unsubscribe":
			delete(c.subscriptions, subMsg.PropertyID)
			log.Printf("Client unsubscribed from property: %s", subMsg.PropertyID)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ── Health Check ───────────────────────────────────────────────────────────

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"status":    "healthy",
			"service":   "realtime",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		},
	})
}

// ── Main ───────────────────────────────────────────────────────────────────

func main() {
	cfg := loadConfig()
	hub := newHub()

	go hub.run()

	// WebSocket endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// Health check
	http.HandleFunc("/health", healthHandler)

	// TODO: Redis pub/sub subscriber
	// In Phase 1, connect to Redis and forward published events to the hub.
	// For now, the service accepts WebSocket connections and handles subscriptions.

	addr := fmt.Sprintf("0.0.0.0:%s", cfg.Port)
	log.Printf("🚀 Realtime service starting on %s", addr)
	log.Printf("📡 WebSocket endpoint: ws://%s/ws", addr)
	log.Printf("📋 Health check: http://%s/health", addr)

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}
