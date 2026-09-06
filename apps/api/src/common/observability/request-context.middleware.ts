import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
 use(req:Request,res:Response,next:NextFunction){
  const incoming=req.header('x-request-id');
  const requestId=incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming) ? incoming : randomUUID();
  req.headers['x-request-id']=requestId;
  res.setHeader('x-request-id',requestId);
  const started=Date.now();
  res.on('finish',()=>process.stdout.write(JSON.stringify({
   event:'http_request',requestId,method:req.method,path:req.originalUrl,statusCode:res.statusCode,durationMs:Date.now()-started
  })+'\n'));
  next();
 }
}
