import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RATE_LIMIT_POLICY } from './rate-limit.policy';

@Injectable()
export class DistributedRateLimiterService implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', { lazyConnect: true, maxRetriesPerRequest: 1 });
  async consume(key:string, bucket:keyof typeof RATE_LIMIT_POLICY) {
    const policy=RATE_LIMIT_POLICY[bucket];
    try {
      if(this.redis.status==='wait') await this.redis.connect();
      const redisKey=`rl:${bucket}:${key}:${Math.floor(Date.now()/1000/policy.windowSeconds)}`;
      const count=await this.redis.incr(redisKey);
      if(count===1) await this.redis.expire(redisKey,policy.windowSeconds+1);
      return {allowed:count<=policy.maxRequests,count,limit:policy.maxRequests,resetSeconds:policy.windowSeconds};
    } catch { return {allowed:true,count:0,limit:policy.maxRequests,resetSeconds:policy.windowSeconds}; }
  }
  async onModuleDestroy(){await this.redis.quit().catch(()=>undefined);}
}
