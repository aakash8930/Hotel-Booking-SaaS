import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DistributedRateLimiterService } from './distributed-rate-limiter.service';
import { RATE_LIMIT_BUCKET } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
 constructor(private readonly limiter:DistributedRateLimiterService,private readonly reflector:Reflector){}
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest();
  const bucket=this.reflector.getAllAndOverride<any>(RATE_LIMIT_BUCKET,[context.getHandler(),context.getClass()])||'publicRead';
  const identity=String(req.user?.id||req.ip||req.headers['x-forwarded-for']||'anonymous');
  const result=await this.limiter.consume(identity,bucket);
  if(!result.allowed){throw new TooManyRequestsException('Rate limit exceeded');}
  return true;
 }
}