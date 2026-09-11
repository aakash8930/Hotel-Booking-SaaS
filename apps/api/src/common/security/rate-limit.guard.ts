import { CanActivate, ExecutionContext, HttpStatus, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DistributedRateLimiterService } from './distributed-rate-limiter.service';
import { RATE_LIMIT_BUCKET } from './rate-limit.decorator';
import { RATE_LIMIT_POLICY } from './rate-limit.policy';

type Bucket = keyof typeof RATE_LIMIT_POLICY;

@Injectable()
export class RateLimitGuard implements CanActivate {
 constructor(private readonly limiter:DistributedRateLimiterService,private readonly reflector:Reflector){}
  async canActivate(context:ExecutionContext){
   const req=context.switchToHttp().getRequest();
   const bucket=(this.reflector.getAllAndOverride<Bucket>(RATE_LIMIT_BUCKET,[context.getHandler(),context.getClass()])||'publicRead') as Bucket;
   const identity=String(req.user?.id||req.ip||req.headers['x-forwarded-for']||'anonymous');
   const result=await this.limiter.consume(identity,bucket);
   if(!result.allowed){throw new HttpException('Rate limit exceeded',HttpStatus.TOO_MANY_REQUESTS);}
   return true;
  }
}