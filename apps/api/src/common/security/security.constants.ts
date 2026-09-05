export const SECURITY_HEADERS = {
  hsts: 'max-age=31536000; includeSubDomains',
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
} as const;

export const REQUEST_LIMITS = {
  jsonBodyBytes: 1024 * 1024,
  urlEncodedBytes: 1024 * 1024,
} as const;
