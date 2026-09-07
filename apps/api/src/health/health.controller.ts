import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';

@Controller('health')
export class HealthController {
 @Get() live(){return {status:'ok',service:'api',timestamp:new Date().toISOString()};}
 @Get('ready')
 async ready(){
  try{await prisma.$queryRaw`SELECT 1`;return {status:'ready',checks:{database:'ok'},timestamp:new Date().toISOString()};}
  catch{throw new ServiceUnavailableException({status:'not_ready',checks:{database:'failed'},timestamp:new Date().toISOString()});}
 }
}