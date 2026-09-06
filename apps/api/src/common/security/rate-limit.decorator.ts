import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_POLICY } from './rate-limit.policy';
export const RATE_LIMIT_BUCKET = 'rate_limit_bucket';
export const RateLimit = (bucket:keyof typeof RATE_LIMIT_POLICY) => SetMetadata(RATE_LIMIT_BUCKET,bucket);
