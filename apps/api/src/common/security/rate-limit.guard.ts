import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException } from '@nestjs/common';
import { DistributedRateLimiterService } from './distributed-rate-limiter.service';
@Injectable()
export class RateLimitGuard implements CanActivate {
 constructor(private readonly limiter:DistributedRateLimiterService){}
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest();
  const bucket=(req.headers['x-rate-limit-bucket']||'publicRead') as any;
  const identity=String(req.ip||req.headers['x-forwarded-for']||'anonymous');
  const result=await this.limiter.consume(identity,bucket);
  if(!result.allowed){throw new TooManyRequestsException('Rate limit exceeded');}
  return true;
 }
}
