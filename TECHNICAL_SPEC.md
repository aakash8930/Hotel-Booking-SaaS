# 🛠️ StayEase Technical Specification
## Engineering Architecture & Infrastructure

This document provides the technical validation for the StayEase platform. The system is designed for high concurrency, strict data integrity, and low-latency real-time updates.

---

## 🏗️ System Architecture

### 1. The Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS.
- **Backend**: NestJS 10 (Modular Architecture).
- **Real-time**: Go (Golang) + Gorilla WebSockets.
- **Database**: PostgreSQL (Relational core) + Redis (Pub/Sub & Caching).
- **AI Layer**: Google Gemini API (Generative content & FAQ).
- **Payments**: PhonePe UPI Integration.

### 2. The "Secret Sauce": Database Integrity
Unlike 99% of booking apps, StayEase prevents double-bookings at the **Storage Layer** rather than the **Application Layer**.

**The Mechanism**: PostgreSQL `EXCLUDE` constraint using `gist` indexing on `daterange`.
**The Result**: Even if 1,000 users attempt to book the same room at the exact same millisecond, the database will physically reject all but one. This eliminates race conditions entirely.

### 3. Real-time Availability Engine
To avoid expensive database polling, StayEase uses a **Hybrid Push Architecture**:
`NestJS API` $\rightarrow$ `Redis Pub/Sub` $\rightarrow$ `Go WebSocket Service` $\rightarrow$ `Browser`

This allows the platform to handle thousands of concurrent guests seeing live "Room Taken" or "Viewer Count" updates with sub-100ms latency.

### 4. Data Model Highlights
- **Host/Property/Room**: A hierarchical 1:N relationship allowing for complex property setups.
- **Booking State Machine**: A strict transition logic (`PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PAID`) that prevents illegal status jumps.
- **Billing**: Flexible `BillingPlan` (Commission vs Subscription) allowing for diverse B2B pricing.

---

## 🚀 Scalability & Deployment
The platform is designed as a **Monorepo**, making it easy to deploy across a modern cloud stack:
- **Frontend**: Vercel (Edge Network).
- **API**: Railway/Render (Auto-scaling containers).
- **DB**: Neon/Supabase (Serverless Postgres).
- **Real-time**: Railway (Go binary).

## 🛡️ Security Posture
- **JWT Rotation**: Implementation of Access + Refresh token pairs to ensure session security.
- **Role-Based Access Control (RBAC)**: Strict separation between `GUEST`, `HOST`, and `ADMIN` roles.
- **Input Validation**: Comprehensive DTO validation via `class-validator` to prevent injection and malformed data.
