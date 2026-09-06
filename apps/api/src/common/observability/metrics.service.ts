import { Injectable } from '@nestjs/common';

type Metric = { count:number; errors:number; totalMs:number; lastMs:number };
@Injectable()
export class MetricsService {
 private readonly metrics = new Map<string, Metric>();
 record(path:string,status:number,durationMs:number){
  const m=this.metrics.get(path)??{count:0,errors:0,totalMs:0,lastMs:0};
  m.count++; m.errors += status >= 500 ? 1 : 0; m.totalMs += durationMs; m.lastMs=durationMs;
  this.metrics.set(path,m);
 }
 snapshot(){return Object.fromEntries([...this.metrics].map(([path,m])=>[path,{...m,avgMs:m.count?Math.round(m.totalMs/m.count*100)/100:0,errorRate:m.count?m.errors/m.count:0}]))}
}
