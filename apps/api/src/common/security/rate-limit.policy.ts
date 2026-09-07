export const RATE_LIMIT_POLICY = {
  auth: { windowSeconds: 60, maxRequests: 10 },
  booking: { windowSeconds: 60, maxRequests: 30 },
  publicRead: { windowSeconds: 60, maxRequests: 120 },
  hostWrite: { windowSeconds: 60, maxRequests: 60 },
} as const;
